import moment from "moment";
import _ from "lodash";

import { D2, D2Api, DeleteResponse } from "./d2.types";
import {
    OrganisationUnit,
    PaginatedObjects,
    CategoryOption,
    CategoryCombo,
    MetadataResponse,
    ModelFields,
    MetadataGetParams,
    ModelName,
    MetadataFields,
    DataEntryForm,
    DataValueResponse,
    Response,
    DataValue,
    MetadataOptions,
    Message,
    DataValueToPost,
    Ref,
} from "./db.types";
import "../utils/lodash-mixins";
import { promiseMap } from "../utils/promises";
import { User } from "./config";

function getDbFields(modelFields: ModelFields): string[] {
    return _(modelFields)
        .map((value, key) => {
            if (typeof value === "function") {
                return key + "[" + getDbFields(value(metadataFields)).join(",") + "]";
            } else if (typeof value === "boolean") {
                return value ? key : null;
            } else {
                return key + "[" + getDbFields(value).join(",") + "]";
            }
        })
        .compact()
        .value();
}

function addPrefix(modelName: string, key: string): string {
    return modelName === "global" ? key : `${modelName}:${key}`;
}

function toDbParams(metadataParams: MetadataGetParams): _.Dictionary<string> {
    return _(metadataParams)
        .flatMap((params, modelName) => {
            if (!params) {
                return [];
            } else {
                const fields = params.fields || metadataFields[modelName as ModelName];
                return [
                    [addPrefix(modelName, "fields"), getDbFields(fields).join(",")],
                    // NOTE: Only the first filter is actually passed. d2.Api does support arrays for
                    // the generic param 'filter=', but not for metadata-specific 'MODEL:filter='.
                    ..._(params.filters || [])
                        .take(1)
                        .map(filter => [addPrefix(modelName, "filter"), filter])
                        .value(),
                ];
            }
        })
        .fromPairs()
        .value();
}

export interface AnalyticsRequest {
    dimension: string[];
    filter?: string[];
    skipMeta?: boolean;
    skipRounding?: boolean;
}

export interface AnalyticsResponse {
    headers: Array<{
        name: "dx" | "dy";
        column: "Data";
        valueType: "TEXT" | "NUMBER";
        type: "java.lang.String" | "java.lang.Double";
        hidden: boolean;
        meta: boolean;
    }>;

    rows: Array<string[]>;
    width: number;
    height: number;
}

// https://docs.dhis2.org/2.30/en/developer/html/dhis2_developer_manual_full.html#webapi_reading_data_values
export interface GetDataValuesParams {
    dataSet?: string[];
    dataElementGroup?: string[];
    orgUnit: string[];
    period?: string[];
    includeDeleted?: boolean;
    lastUpdated?: string;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
}

const ref = { id: true };

export const metadataFields: MetadataFields = {
    global: {
        id: true,
    },
    attributeValues: {
        value: true,
        attribute: { id: true, code: true },
    },
    attributes: {
        id: true,
        code: true,
        valueType: true,
        name: true,
    },
    categories: {
        id: true,
        displayName: true,
        code: true,
        dataDimensionType: true,
        dataDimension: true,
        categoryOptions: metadataFields => metadataFields.categoryOptions,
    },
    categoryCombos: {
        id: true,
        displayName: true,
        code: true,
        categories: ref,
    },
    categoryOptionCombos: {
        id: true,
        displayName: true,
        categoryCombo: ref,
        categoryOptions: ref,
    },
    categoryOptions: {
        id: true,
        name: true,
        displayName: true,
        code: true,
    },
    categoryOptionGroups: {
        id: true,
        displayName: true,
        code: true,
        categoryOptions: metadataFields => metadataFields.categoryOptions,
    },
    dashboards: {
        id: true,
        dashboardItems: {
            id: true,
            chart: { id: true },
            map: { id: true },
            reportTable: { id: true },
        },
    },
    dataElements: {
        id: true,
        code: true,
        displayName: true,
        formName: true,
        categoryCombo: metadataFields => metadataFields.categoryCombos,
    },
    dataSetElements: {
        dataSet: ref,
        dataElement: ref,
        categoryCombo: ref,
    },
    dataInputPeriods: {
        openingDate: true,
        closingDate: true,
        period: { id: true },
    },
    dataSets: {
        id: true,
        name: true,
        description: true,
        publicAccess: true,
        periodType: true,
        categoryCombo: ref,
        dataElementDecoration: true,
        renderAsTabs: true,
        organisationUnits: ref,
        dataSetElements: metadataFields => metadataFields.dataSetElements,
        openFuturePeriods: true,
        timelyDays: true,
        expiryDays: true,
        sections: ref,
        dataInputPeriods: metadataFields => metadataFields.dataInputPeriods,
        attributeValues: metadataFields => metadataFields.attributeValues,
        formType: true,
    },
    dataElementGroups: {
        id: true,
        displayName: true,
        code: true,
        dataElements: ref,
    },
    organisationUnits: {
        id: true,
        displayName: true,
        path: true,
        level: true,
        ancestors: {
            id: true,
            displayName: true,
            path: true,
            level: true,
        },
    },
    organisationUnitGroupSets: {
        id: true,
        name: true,
        organisationUnitGroups: {
            name: true,
            organisationUnits: {
                id: true,
            },
        },
    },
    organisationUnitLevels: {
        id: true,
        displayName: true,
        level: true,
    },
    sections: { id: true },
    users: {
        id: true,
        name: true,
    },
    userGroups: {
        id: true,
        name: true,
        users: { id: true },
    },
    userRoles: {
        id: true,
        name: true,
        authorities: true,
    },
};

export type ApiResponse<Value> = { status: true; value: Value } | { status: false; error: string };

export type ModelReference = { model: string; id: string };

export default class DbD2 {
    d2: D2;
    api: D2Api;

    constructor(d2: D2) {
        this.d2 = d2;
        this.api = d2.Api.getApi();
    }

    public async getMetadata<T>(params: MetadataGetParams): Promise<T> {
        const options = { translate: true, ...toDbParams(params) };
        const metadata = await this.api.get("/metadata", options);
        const emptyRecords = _.mapValues(params, () => []);
        const metadataWithEmptyRecords = { ...emptyRecords, ...metadata };
        return metadataWithEmptyRecords as T;
    }

    public async getOrganisationUnitsFromIds(
        ids: string[],
        options: { pageSize?: number }
    ): Promise<PaginatedObjects<OrganisationUnit>> {
        const { pager, organisationUnits } = await this.api.get("/organisationUnits", {
            paging: true,
            pageSize: options.pageSize || 10,
            filter: [`id:in:[${_(ids).take(options.pageSize).join(",")}]`],
            fields: ["id", "displayName", "path", "level", "ancestors[id,displayName,path,level]"],
        });
        const newPager = { ...pager, total: ids.length };
        return { pager: newPager, objects: organisationUnits };
    }

    public async getCategoryOptionsByCategoryCode(code: string): Promise<CategoryOption[]> {
        const { categories } = await this.api.get("/categories", {
            filter: [`code:in:[${code}]`],
            fields: ["categoryOptions[id,displayName,code,dataDimension,dataDimensionType]"],
        });

        if (_(categories).isEmpty()) {
            return [];
        } else {
            return _(categories[0].categoryOptions).sortBy("displayName").value();
        }
    }

    public async getCategoryCombosByCode(codes: string[]): Promise<CategoryCombo[]> {
        const { categoryCombos } = await this.api.get("/categoryCombos", {
            paging: false,
            filter: [`code:in:[${codes.join(",")}]`],
            fields: ["id,code,displayName"],
        });
        return categoryCombos;
    }

    public async getCurrentUser(): Promise<User> {
        return this.api.get<User>("/me", { paging: false, fields: ["id", "name"] });
    }

    public async getCocsByCategoryComboCode(
        codes: string[]
    ): Promise<Array<{ id: string; categoryOptions: Ref[] }>> {
        const filter = `code:in:[${codes.join(",")}]`;

        const { categoryCombos } = await this.getMetadata<{
            categoryCombos: Array<{
                code: string;
                categoryOptionCombos: Array<{
                    id: string;
                    categoryOptions: Array<{ id: string }>;
                }>;
            }>;
        }>({
            categoryCombos: {
                fields: {
                    code: true,
                    categoryOptionCombos: {
                        id: true,
                        categoryOptions: { id: true },
                    },
                },
                filters: [filter],
            },
        });

        const missingCodes = _(codes)
            .difference(categoryCombos.map(cc => cc.code))
            .value();

        if (!_(missingCodes).isEmpty()) {
            console.error(`categoryCombo codes not found: ${missingCodes.join(", ")}`);
        }

        return _(categoryCombos)
            .flatMap(categoryCombo => categoryCombo.categoryOptionCombos)
            .value();
    }

    public async postMetadata<Metadata extends object>(
        metadata: Metadata,
        options: MetadataOptions = {}
    ): Promise<ApiResponse<MetadataResponse>> {
        const queryString = _(options).isEmpty()
            ? ""
            : "?" +
              _(options as object[])
                  .map((value, key) => `${key}=${value}`)
                  .join("&");
        try {
            const response = (await this.api.post(
                "/metadata" + queryString,
                metadata
            )) as MetadataResponse;
            return { status: true, value: response };
        } catch (err0) {
            const err = err0 as any;
            return { status: false, error: err.message || err.toString() };
        }
    }

    public async postForm(dataSetId: string, dataEntryForm: DataEntryForm): Promise<boolean> {
        await this.api.post(["dataSets", dataSetId, "form"].join("/"), dataEntryForm);
        return true;
    }

    public async sendMessage(message: Message): Promise<void> {
        this.api.post("/messageConversations", message);
    }

    public async postDataValues(dataValues: DataValue[]): Promise<Response<object>> {
        const dataValuesToPost: DataValueToPost[] = _(dataValues)
            .map(dv => {
                if (!dv.period) return;

                return {
                    dataSet: dv.dataSet,
                    completeDate: dv.completeDate,
                    period: dv.period,
                    orgUnit: dv.orgUnit,
                    attributeOptionCombo: dv.attributeOptionCombo,
                    dataElement: dv.dataElement,
                    categoryOptionCombo: dv.categoryOptionCombo,
                    value: dv.value,
                    comment: dv.comment,
                };
            })
            .compact()
            .value();

        const dataValuesChunks = _.chunk(dataValuesToPost, 200);

        const responses = await promiseMap(dataValuesChunks, dataValuesChunk => {
            return this.api.post("dataValueSets", {
                dataValues: dataValuesChunk,
            }) as Promise<DataValueResponse>;
        });

        const errorResponses = responses.filter(response => {
            if ("httpStatus" in response) {
                return response.response.status !== "SUCCESS";
            } else {
                return response.status !== "SUCCESS";
            }
        });

        if (_(errorResponses).isEmpty()) {
            return { status: true };
        } else {
            return { status: false, error: errorResponses };
        }
    }

    public async deleteMany(
        modelReferences: ModelReference[],
        ignoreErrorsFrom: string[] = []
    ): Promise<Response<string>> {
        const errors = _.compact(
            await promiseMap(modelReferences, async ({ model, id }) => {
                const { httpStatus, httpStatusCode, status, message } = await this.api
                    .delete(`/${model}/${id}`)
                    .catch((err: DeleteResponse) => {
                        if (_.includes(ignoreErrorsFrom, model)) {
                            return {
                                httpStatus: "OK",
                                httpStatusCode: 204,
                                status: "OK",
                                message: `Deletion of ${model} resources failed but are ignored`,
                            };
                        } else if (err.httpStatusCode) {
                            return err;
                        } else {
                            throw err;
                        }
                    });

                if (httpStatusCode === 404) {
                    return null;
                } else if (status !== "OK") {
                    return message || `${httpStatus} (${httpStatusCode})`;
                } else {
                    return null;
                }
            })
        );

        return _(errors).isEmpty()
            ? { status: true }
            : {
                  status: false,
                  error: errors.join("\n"),
              };
    }

    public getAnalytics(request: AnalyticsRequest): Promise<AnalyticsResponse> {
        return this.api.get("/analytics", request) as Promise<AnalyticsResponse>;
    }

    public async getDataValues(params: GetDataValuesParams): Promise<DataValue[]> {
        const parseDate = (date: Date | undefined, daysOffset = 0) =>
            date ? moment(date).add(daysOffset, "days").format("YYYY-MM-DD") : undefined;
        const apiParams = {
            ...params,
            startDate: parseDate(params.startDate),
            endDate: parseDate(params.endDate, 1),
        };
        const apiParamsClean = _.omitBy(apiParams, _.isNil);
        const response = (await this.api.get("/dataValueSets", apiParamsClean)) as {
            dataValues?: DataValue[];
        };

        return response.dataValues || [];
    }
}

export function toStatusResponse(response: ApiResponse<MetadataResponse>): Response<string> {
    if (!response.status) {
        return { status: false, error: response.error };
    } else if (response.value.status === "OK") {
        return { status: true };
    } else {
        const errors = _(response.value.typeReports)
            .flatMap(tr => tr.objectReports)
            .flatMap(or => or.errorReports)
            .map("message")
            .value();

        return { status: false, error: errors.join("\n") };
    }
}
