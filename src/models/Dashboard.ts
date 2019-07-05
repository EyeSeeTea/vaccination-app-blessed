import _, { Dictionary } from "lodash";
import DbD2 from "./db-d2";
import { generateUid } from "d2/uid";
import {
    dashboardItemsConfig,
    itemsMetadataConstructor,
    buildDashboardItems,
} from "./dashboard-items";
import { Ref, OrganisationUnitPathOnly, OrganisationUnitWithName } from "./db.types";
import { Antigen } from "./campaign";
import { Moment } from "moment";
import { getDaysRange } from "../utils/date";
import { AntigenDisaggregationEnabled } from "./AntigensDisaggregation";
import { MetadataConfig } from "./config";

type DashboardItem = {
    type: string;
};

export interface ChartItem extends DashboardItem {
    chart: Ref;
}

export interface ReportTableItem extends DashboardItem {
    reportTable: Ref;
}

type DashboardData = {
    id: string;
    name: string;
    code: string;
    dashboardItems: Array<ReportTableItem | ChartItem>;
};

type allDashboardElements = {
    charts: Array<object>;
    reportTables: Array<object>;
    items: Array<ChartItem | ReportTableItem>;
};

export type DashboardMetadata = {
    dashboards: DashboardData[];
    charts: object[];
    reportTables: object[];
};

export class Dashboard {
    constructor(private db: DbD2) {}

    static build(db: DbD2) {
        return new Dashboard(db);
    }

    private async getMetadataForDashboardItems(
        antigens: Antigen[],
        organisationUnitsPathOnly: OrganisationUnitPathOnly[],
        antigensDisaggregation: AntigenDisaggregationEnabled,
        teamIds: string[],
        metadataConfig: MetadataConfig,
        allCategoryIds: { ageGroup: string; doses: string; teams: string; antigen: string }
    ) {
        const orgUnitsId = _(organisationUnitsPathOnly).map("id");
        const { organisationUnits: organisationUnitsWithName } = await this.db.api.get<{
            organisationUnits?: { id: string; displayName: string; path: string }[];
        }>("/metadata", {
            "organisationUnits:fields": "id,displayName,path",
            "organisationUnits:filter": `id:in:[${orgUnitsId}]`,
        });
        const antigenCodes = antigens.map(an => an.code);
        const antigensMeta = _.filter(metadataConfig.antigens, an =>
            _.includes(antigenCodes, an.code)
        );

        const elementsToFetch = dashboardItemsConfig.metadataToFetch;

        const allDataElementCodes = elementsToFetch.DATA_ELEMENT.join(",");
        const dataElements = _.filter(metadataConfig.dataElements, de =>
            _.includes(allDataElementCodes, de.code)
        );

        const allIndicatorCodes = elementsToFetch.INDICATOR.join(",");
        const indicators = _.filter(metadataConfig.indicators, indicator =>
            _.includes(allIndicatorCodes, indicator.code)
        );

        const categoryOptionsByName: _.Dictionary<string> = _(metadataConfig.categoryOptions)
            .map(co => [co.displayName, co.id])
            .fromPairs()
            .value();

        const ageGroupsToId = (ageGroups: string[]): string[] =>
            _.map(ageGroups, ag => categoryOptionsByName[ag]);

        const ageGroupsByAntigen: _.Dictionary<string[]> = _(antigensDisaggregation)
            .map(d => [d.antigen.id, ageGroupsToId(d.ageGroups)])
            .fromPairs()
            .value();

        const dosesByAntigen = _(antigensDisaggregation)
            .map(d => [d.antigen.id, d.antigen.doses])
            .fromPairs()
            .value();

        const dashboardMetadata = {
            antigenCategory: allCategoryIds.antigen,
            elementsMetadata: [
                {
                    type: "DATA_ELEMENT",
                    data: dataElements,
                    key: "dataElement",
                },
                {
                    type: "INDICATOR",
                    data: indicators,
                    key: "indicator",
                },
            ],
            antigensMeta,
            organisationUnitsWithName,
            legendMetadata: {
                get: (code: string) =>
                    _(metadataConfig.legendSets)
                        .keyBy("code")
                        .getOrFail(code).id,
            },
            disaggregationMetadata: {
                teams: () => ({
                    categoryId: allCategoryIds.teams,
                    elements: teamIds,
                }),
                ageGroups: (antigen: Ref) => ({
                    categoryId: allCategoryIds.ageGroup,
                    elements: ageGroupsByAntigen[antigen.id],
                }),
                doses: (antigen: Ref) => ({
                    categoryId: allCategoryIds.doses,
                    elements: dosesByAntigen[antigen.id],
                }),
            },
        };

        return dashboardMetadata;
    }

    public async create({
        dashboardId,
        datasetName,
        organisationUnits,
        antigens,
        startDate,
        endDate,
        antigensDisaggregation,
        teamIds,
        metadataConfig,
        dashboardCode,
        allCategoryIds,
    }: {
        dashboardId?: string;
        datasetName: string;
        organisationUnits: OrganisationUnitPathOnly[];
        antigens: Antigen[];
        startDate: Moment;
        endDate: Moment;
        antigensDisaggregation: AntigenDisaggregationEnabled;
        teamIds: string[];
        dashboardCode: string;
        allCategoryIds: { ageGroup: string; doses: string; antigen: string; teams: string };
        metadataConfig: MetadataConfig;
    }): Promise<DashboardMetadata> {
        const dashboardItemsMetadata = await this.getMetadataForDashboardItems(
            antigens,
            organisationUnits,
            antigensDisaggregation,
            teamIds,
            metadataConfig,
            allCategoryIds
        );

        const dashboardItems = this.createDashboardItems(
            datasetName,
            startDate,
            endDate,
            dashboardItemsMetadata
        );

        const keys: Array<keyof allDashboardElements> = ["items", "charts", "reportTables"];
        const { items, charts, reportTables } = _(keys)
            .map(key => [key, _(dashboardItems).getOrFail(key)])
            .fromPairs()
            .value();

        const dashboard = {
            id: dashboardId || generateUid(),
            name: `${datasetName}_DASHBOARD`,
            code: dashboardCode,
            dashboardItems: items,
        };

        return { dashboards: [dashboard], charts, reportTables };
    }

    createDashboardItems(
        datasetName: String,
        startDate: Moment,
        endDate: Moment,
        dashboardItemsMetadata: Dictionary<any>
    ): allDashboardElements {
        const { organisationUnitsWithName, legendMetadata } = dashboardItemsMetadata;
        const organisationUnitsMetadata = organisationUnitsWithName.map(
            (ou: OrganisationUnitWithName) => ({
                id: ou.id,
                parents: { [ou.id]: ou.path },
                name: ou.displayName,
            })
        );
        const periodRange = getDaysRange(startDate, endDate);
        const periodItems = periodRange.map(date => ({ id: date.format("YYYYMMDD") }));
        const antigensMeta = _(dashboardItemsMetadata).getOrFail("antigensMeta");
        const dashboardItemsElements = itemsMetadataConstructor(dashboardItemsMetadata);

        const { metadataToFetch, ...itemsConfig } = dashboardItemsConfig;
        const expectedCharts = _.flatMap(itemsConfig, _.keys);

        const keys = ["antigenCategory", "disaggregationMetadata", ...expectedCharts] as Array<
            keyof typeof dashboardItemsElements
        >;
        const { antigenCategory, disaggregationMetadata, legendsMetadata, ...elements } = _(keys)
            .map(key => [key, _(dashboardItemsElements).getOrFail(key)])
            .fromPairs()
            .value();

        const dashboardItems = buildDashboardItems(
            antigensMeta,
            datasetName,
            organisationUnitsMetadata,
            periodItems,
            antigenCategory,
            disaggregationMetadata,
            elements,
            legendMetadata
        );
        const charts = _(dashboardItems).getOrFail("charts");
        const reportTables = _(dashboardItems).getOrFail("reportTables");

        const chartIds = charts.map((chart: any) => chart.id);
        const reportTableIds = reportTables.map(table => table.id);

        const dashboardCharts = chartIds.map((id: string) => ({
            type: "CHART",
            chart: { id },
        }));

        const dashboardTables = reportTableIds.map((id: string) => ({
            type: "REPORT_TABLE",
            reportTable: { id },
        }));

        const dashboardData = {
            items: [...dashboardCharts, ...dashboardTables],
            charts,
            reportTables,
        };

        return dashboardData;
    }
}
