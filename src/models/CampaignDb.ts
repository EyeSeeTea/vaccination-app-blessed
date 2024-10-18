import DbD2, { ApiResponse, ModelReference } from "./db-d2";
import { generateUid } from "d2/uid";
import moment from "moment";
import _ from "lodash";
import "../utils/lodash-mixins";

import Campaign from "./campaign";
import { DataSetCustomForm } from "./DataSetCustomForm";
import {
    Maybe,
    MetadataResponse,
    DataEntryForm,
    Section,
    CategoryOption,
    NamedRef,
} from "./db.types";
import { Metadata, DataSet, Response } from "./db.types";
import { formatDay } from "../utils/date";
import { getDataElements, CocMetadata } from "./AntigensDisaggregation";
import { Dashboard, DashboardMetadata } from "./Dashboard";
import { Teams, CategoryOptionTeam } from "./Teams";
import { getDashboardCode, getByIndex, baseConfig } from "./config";

interface DataSetWithSections {
    sections: Array<{ id: string; name: string; dataSet: { id: string } }>;
    dataEntryForm: { id: string };
}

/*
Problem: When syncing data from field servers to HQ, data cannot usually be imported
because the current time is after the closing date of the data input periods.

Solution: Use a custom attribute to store the data input periods
*/

export type DataInput = {
    periodStart: string;
    periodEnd: string;
    openingDate: string;
    closingDate: string;
};

interface PostSaveMetadata {
    visualizations: object[];
    dashboards: object[];
    dataSets: DataSet[];
    dataEntryForms: DataEntryForm[];
    sections: Section[];
    categoryOptions: NamedRef[];
}

export default class CampaignDb {
    antigenCategoryId: string;
    ageGroupCategoryId: string;
    teamsCategoryId: string;
    dosesCategoryId: string;
    catComboIdForTeams: string;

    constructor(public campaign: Campaign) {
        const { categories, categoryCombos, categoryCodeForAgeGroup } = campaign.config;
        const { categoryCodeForTeams, categoryCodeForDoses, categoryCodeForAntigens } =
            campaign.config;
        const { categoryComboCodeForTeams } = campaign.config;
        const categoriesByCode = _(categories).keyBy("code");

        this.ageGroupCategoryId = categoriesByCode.getOrFail(categoryCodeForAgeGroup).id;
        this.teamsCategoryId = categoriesByCode.getOrFail(categoryCodeForTeams).id;
        this.dosesCategoryId = categoriesByCode.getOrFail(categoryCodeForDoses).id;
        this.antigenCategoryId = categoriesByCode.getOrFail(categoryCodeForAntigens).id;
        this.catComboIdForTeams = getByIndex(categoryCombos, "code", categoryComboCodeForTeams).id;
    }

    public async createDashboard(): Promise<string> {
        if (!this.campaign.id) throw new Error("Cannot create dashboard for unpersisted campaign");
        const teamIds = this.campaign.teamsMetadata.elements.map(t => t.id);
        const dashboardMetadata = await this.getDashboardMetadata(this.campaign.id, teamIds);
        const metadata: PostSaveMetadata = {
            ...dashboardMetadata,
            dataSets: [],
            dataEntryForms: [],
            sections: [],
            categoryOptions: [],
        };
        const response = await this.postSave(metadata, []);
        const dashboard = dashboardMetadata.dashboards[0];

        if (!response.status || !dashboard || !dashboard.id) {
            throw new Error("Error creating dashboard");
        } else {
            return dashboard.id;
        }
    }

    public async save(): Promise<Response<string>> {
        const { campaign } = this;
        const { db, config: metadataConfig, teamsMetadata } = campaign;
        const dataSetId = campaign.id || generateUid();

        if (!campaign.startDate || !campaign.endDate) {
            return { status: false, error: "Campaign Dates not set" };
        }
        const startDate = moment(campaign.startDate).startOf("day");
        const endDate = moment(campaign.endDate).endOf("day");

        const teamGenerator = Teams.build(teamsMetadata);
        const newTeams = teamGenerator.getTeams({
            teams: campaign.teams || 0,
            name: campaign.name,
            organisationUnits: campaign.organisationUnits,
            teamsCategoyId: this.teamsCategoryId,
            startDate,
            endDate,
            isEdit: campaign.isEdit(),
        });

        const teamsToDelete = _.differenceBy(teamsMetadata.elements, newTeams, "id");

        const disaggregationData = campaign.getEnabledAntigensDisaggregation();
        const dataElements = getDataElements(metadataConfig, disaggregationData);

        const dataSetElements = dataElements.map(dataElement => ({
            dataSet: { id: dataSetId },
            dataElement: { id: dataElement.id },
            categoryCombo: { id: dataElement.categoryCombo.id },
        }));

        const dataInput = getDataInputFromCampaign(campaign);
        const existingDataSet = await this.getExistingDataSet();
        const metadataCoc = await campaign.antigensDisaggregation.getCocMetadata(db);
        const dataEntryForm = await this.getDataEntryForm(existingDataSet, metadataCoc);
        const sections = await this.getSections(db, dataSetId, existingDataSet, metadataCoc);
        const sharing = await campaign.getDataSetSharing();
        const campaignOrgUnitRefs = campaign.organisationUnits.map(ou => ({ id: ou.id }));

        const dataSet: DataSet = {
            id: dataSetId,
            name: campaign.name,
            shortName: campaign.name.slice(0, 50),
            description: campaign.description,
            periodType: "Daily",
            categoryCombo: { id: this.catComboIdForTeams },
            dataElementDecoration: true,
            renderAsTabs: true,
            organisationUnits: campaignOrgUnitRefs,
            dataSetElements,
            openFuturePeriods: 1,
            timelyDays: 0,
            expiryDays: 0,
            formType: "CUSTOM",
            dataInputPeriods: [],
            attributeValues: [
                { value: "true", attribute: { id: metadataConfig.attributes.app.id } },
                { value: "true", attribute: { id: metadataConfig.attributes.hideInTallySheet.id } },
                {
                    value: dataInput ? JSON.stringify(dataInput) : "",
                    attribute: { id: metadataConfig.attributes.dataInputPeriods.id },
                },
            ],
            dataEntryForm: { id: dataEntryForm.id },
            sections: sections.map(section => ({ id: section.id })),
            ...sharing,
        };

        const teamIds = newTeams.map(team => team.id);
        const dashboardMetadata = await this.getDashboardMetadata(dataSetId, teamIds);
        const extraDataSets = await this.getExtraDataSets();

        return this.postSave(
            {
                ...dashboardMetadata,
                dataSets: [dataSet, ...extraDataSets],
                dataEntryForms: [dataEntryForm],
                sections,
                categoryOptions: newTeams,
            },
            teamsToDelete
        );
    }

    private async getExtraDataSets(): Promise<DataSet[]> {
        const { campaign } = this;
        const dataSetIds = this.campaign.config.dataSets.extraActivities.map(ds => ds.id);
        const campaignOrgUnitRefs = campaign.organisationUnits.map(ou => ({ id: ou.id }));

        const res = await this.campaign.db.getMetadata<{
            dataSets: Array<DataSet>;
        }>({
            dataSets: {
                filters: [`id:in:[${dataSetIds.join(",")}]`],
                fields: { ":owner": true },
            },
        });

        const extraDataSets = res.dataSets;
        const campaignOrgUnitIds = new Set(campaignOrgUnitRefs.map(ou => ou.id));

        return extraDataSets.map(dataSet => {
            const isExtraDataSetSelected = campaign.extraDataSets.some(ds => ds.id === dataSet.id);

            return {
                ...dataSet,
                organisationUnits: _(dataSet.organisationUnits)
                    .reject(orgUnit => campaignOrgUnitIds.has(orgUnit.id))
                    .concat(isExtraDataSetSelected ? campaignOrgUnitRefs : [])
                    .value(),
            };
        });
    }

    public async saveTargetPopulation(): Promise<Response<string>> {
        const { campaign } = this;
        const { targetPopulation } = this.campaign;

        if (!targetPopulation) {
            return { status: false, error: "There is no target population in campaign" };
        } else {
            const dataValues = await targetPopulation.getDataValues();
            const populationResult = await campaign.db.postDataValues(dataValues);

            if (!populationResult.status) {
                return {
                    status: false,
                    error: JSON.stringify(populationResult.error, null, 2),
                };
            } else {
                return { status: true };
            }
        }
    }

    private async postSave(
        allMetadata: PostSaveMetadata,
        teamsToDelete: CategoryOptionTeam[]
    ): Promise<Response<string>> {
        const { campaign } = this;
        const { db, config } = campaign;
        const { sections, ...nonSectionsMetadata } = allMetadata;
        let metadata;
        let modelReferencesToDelete: ModelReference[];

        if (campaign.isEdit()) {
            // The saving of existing sections on DHIS2 is buggy: /metadata
            // often responds with a 500 Server Error when a data set and their sections are
            // posted on the same request. Workaround: post the sections on a separate request.

            if (!_(sections).isEmpty()) {
                const resultSections = await db.postMetadata({ sections });

                if (!resultSections.status) {
                    return { status: false, error: "Cannot update sections" };
                }
            }
            metadata = nonSectionsMetadata;
            modelReferencesToDelete = await Campaign.getResources(config, db, allMetadata.dataSets);
        } else {
            metadata = allMetadata;
            modelReferencesToDelete = [];
        }

        const result: ApiResponse<MetadataResponse> = await db.postMetadata<Metadata>(metadata);

        if (campaign.isEdit()) {
            await this.cleanUpDashboardItems(db, modelReferencesToDelete);

            // Teams must be deleted after all asociated dashboard and dashboard items (favorites) are deleted
            if (!_.isEmpty(teamsToDelete)) {
                await Teams.deleteTeams(db, teamsToDelete);
            }
        }
        // Update Team Category with new categoryOptions (teams)
        await Teams.updateTeamCategory(db, allMetadata.categoryOptions, teamsToDelete, config);

        if (!result.status) {
            return { status: false, error: result.error };
        } else if (result.value.status !== "OK") {
            return {
                status: false,
                error: JSON.stringify(result.value.typeReports, null, 2),
            };
        } else {
            return { status: true };
        }
    }

    private async cleanUpDashboardItems(
        db: DbD2,
        modelReferencesToDelete: ModelReference[]
    ): Promise<Response<string>> {
        const dashboardItems = _(modelReferencesToDelete)
            .filter(o => _.includes(["visualizations"], o.model))
            .value();

        return await db.deleteMany(dashboardItems);
    }

    private async getSections(
        db: DbD2,
        dataSetId: string,
        existingDataSet: Maybe<DataSetWithSections>,
        cocMetadata: CocMetadata
    ): Promise<Section[]> {
        const { campaign } = this;
        const existingSections = existingDataSet ? existingDataSet.sections : [];
        const existingSectionsByName = _.keyBy(existingSections, "name");
        const disaggregationData = campaign.getEnabledAntigensDisaggregation();

        const sectionsUsed: Section[] = disaggregationData.map((disaggregationData, index) => {
            const sectionName = disaggregationData.antigen.code;
            // !NAME -> Old unused section
            const existingSection =
                existingSectionsByName[sectionName] || existingSectionsByName["!" + sectionName];

            const greyedFields = _(disaggregationData.dataElements)
                .flatMap(dataElementDis => {
                    const groups: CategoryOption[][] = _.cartesianProduct(
                        dataElementDis.categories.map(category => category.categoryOptions)
                    );

                    return groups.map(disaggregation => {
                        const cocId = cocMetadata.getByOptions(disaggregation);
                        if (!cocId)
                            throw new Error(`coc not found: ${JSON.stringify(disaggregation)} `);

                        return {
                            dataElement: { id: dataElementDis.id },
                            categoryOptionCombo: { id: cocId },
                        };
                    });
                })
                .value();

            return {
                id: existingSection ? existingSection.id : generateUid(),
                dataSet: { id: dataSetId },
                sortOrder: index,
                name: sectionName,
                dataElements: disaggregationData.dataElements.map(de => ({ id: de.id })),
                // Use grey fields with inverted logic: set the used dataElement.cocId.
                greyedFields,
            };
        });

        const existingSectionsUnused = _(existingSections)
            .differenceBy(sectionsUsed, "id")
            .map(section =>
                section.name.startsWith("!") ? section : { ...section, name: "!" + section.name }
            )
            .value();

        return _.concat(sectionsUsed, existingSectionsUnused);
    }

    private async getExistingDataSet(): Promise<Maybe<DataSetWithSections>> {
        const { campaign } = this;
        const { dataSets: existingDataSets } = campaign.id
            ? await campaign.db.getMetadata<{
                  dataSets: Array<DataSetWithSections>;
              }>({
                  dataSets: {
                      filters: [`id:eq:${campaign.id}`],
                      fields: {
                          dataEntryForm: { id: true },
                          sections: {
                              id: true,
                              name: true,
                              dataSet: { id: true },
                          },
                      },
                  },
              })
            : { dataSets: [] };

        return _.first(existingDataSets);
    }

    private async getDataEntryForm(
        existingDataSet: Maybe<DataSetWithSections>,
        cocMetadata: CocMetadata
    ): Promise<DataEntryForm> {
        const { campaign } = this;
        const customForm = await DataSetCustomForm.build(campaign, cocMetadata);
        const customFormHtml = customForm.generate();
        const formId =
            (existingDataSet &&
                existingDataSet.dataEntryForm &&
                existingDataSet.dataEntryForm.id) ||
            generateUid();

        return {
            id: formId,
            name: campaign.name + " " + formId, // dataEntryForm.name must be unique
            htmlCode: customFormHtml,
            style: "NONE",
        };
    }

    private async getDashboardMetadata(
        dataSetId: string,
        teamIds: string[]
    ): Promise<DashboardMetadata> {
        const { campaign } = this;
        const { db, config: metadataConfig } = campaign;
        const dashboardGenerator = Dashboard.build(db);

        if (!campaign.startDate || !campaign.endDate) {
            throw new Error("Campaign Dates not set");
        }
        const startDate = moment(campaign.startDate).startOf("day");
        const endDate = moment(campaign.endDate).endOf("day");

        const antigensDisaggregation = campaign.getEnabledAntigensDisaggregation();
        const sharing = await campaign.getDashboardSharing();

        return dashboardGenerator.create({
            dashboardId: campaign.dashboardId,
            datasetName: campaign.name,
            organisationUnits: campaign.organisationUnits,
            antigens: campaign.antigens,
            startDate,
            endDate,
            antigensDisaggregation,
            allCategoryIds: {
                ageGroup: this.ageGroupCategoryId,
                antigen: this.antigenCategoryId,
                teams: this.teamsCategoryId,
                doses: this.dosesCategoryId,
            },
            teamIds,
            metadataConfig,
            dashboardCode: getDashboardCode(metadataConfig, dataSetId),
            sharing,
        });
    }
}

type ModelWithAttributes = {
    attributeValues: Array<{
        attribute: { code: string };
        value: string;
    }>;
};

type DataSetWithDataInputPeriods = {
    dataInputPeriods: Array<{ period: { id: string } }>;
};

type CampaignPeriods = { startDate: Date; endDate: Date };

export function getDataInputFromCampaign(campaign: Campaign): Maybe<DataInput> {
    if (!campaign.startDate || !campaign.endDate) return;

    return {
        periodStart: formatDay(campaign.startDate),
        periodEnd: formatDay(campaign.endDate),
        openingDate: formatDay(campaign.startDate),
        closingDate: formatDay(campaign.endDate, { daysToAdd: campaign.config.expirationDays }),
    };
}

export function getCampaignPeriods<
    DataSet extends ModelWithAttributes & DataSetWithDataInputPeriods
>(dataSet: DataSet): Maybe<CampaignPeriods> {
    return getPeriodDatesFromAttributes(dataSet) || getPeriodDatesFromDataInputPeriods(dataSet);
}

function getPeriodDatesFromAttributes<DataSetWithAttributes extends ModelWithAttributes>(
    dataSet: DataSetWithAttributes
): Maybe<CampaignPeriods> {
    const dataInputAttribute = dataSet.attributeValues.find(
        av => av.attribute.code === baseConfig.attributeCodeForDataInputPeriods
    );
    if (!dataInputAttribute || !dataInputAttribute.value) return;

    const dataInput = JSON.parse(dataInputAttribute.value) as DataInput;

    return {
        startDate: new Date(dataInput.periodStart),
        endDate: new Date(dataInput.periodEnd),
    };
}

function getPeriodDatesFromDataInputPeriods(
    dataSet: DataSetWithDataInputPeriods
): Maybe<CampaignPeriods> {
    const { dataInputPeriods } = dataSet;
    if (!dataInputPeriods) return;

    const getDateFromPeriodId = (periodId: string) => moment(periodId, "YYYYMMDD").toDate();
    const periods = dataInputPeriods.map(dip => dip.period.id);
    const [min, max] = [_.min(periods), _.max(periods)];
    if (!min || !max) return;

    return {
        startDate: getDateFromPeriodId(min),
        endDate: getDateFromPeriodId(max),
    };
}
