import { Metadata } from "./db.types";
import { Dictionary } from "lodash";
export type Maybe<T> = T | undefined;

export type Response<T> = { status: true } | { status: false; error: T };

export interface Pager {
    page: number;
    pageCount: number;
    total: number;
    pageSize: number;
}

export interface PaginatedObjects<T> {
    pager: Pager;
    objects: T[];
}

export interface NamedObject {
    id: string;
    name: string;
}

export interface UserRole {
    id: string;
    name: string;
    authorities: string[];
}

export interface OrganisationUnitPathOnly {
    id: string;
    path: string;
}

export interface OrganisationUnit {
    id: string;
    displayName: string;
    level: number;
    path: string;
    ancestors: Maybe<OrganisationUnit[]>;
}

export interface OrganisationUnitLevel {
    id: string;
    displayName: string;
    level: number;
}

export interface Category {
    id: string;
    code: string;
    displayName: string;
    categoryOptions: CategoryOption[];
    dataDimensionType: "DISAGGREGATION" | "ATTRIBUTE";
    dataDimension: boolean;
}

export interface CategoryOption {
    id: string;
    code: string;
    displayName: string;
}

export interface CategoryOptionGroup {
    id: string;
    code: string;
    displayName: string;
    categoryOptions: CategoryOption[];
}

export interface CategoryCombo {
    id: string;
    code: string;
    displayName: string;
    categories: Ref[];
}

export interface CategoryOptionCombo {
    id: string;
    displayName: string;
    categoryCombo: Ref;
    categoryOptions: Ref[];
}

export interface Attribute {
    id: string;
    code: string;
    valueType: "TEXT" | "BOOLEAN";
    displayName: string;
}

export interface AttributeValue {
    value: string;
    attribute: { id: string; code?: string };
}

export interface DataElement {
    id: string;
    code: string;
    displayName: string;
    categoryCombo: Ref;
    formName: string;
}

export interface Indicator {
    id: string;
    code: string;
}

export interface DataElementGroup {
    id: string;
    code: string;
    displayName: string;
    dataElements: Ref[];
}

export interface Ref {
    id: string;
}

export interface Metadata {
    dataSets?: Array<DataSet>;
    dataEntryForms?: Array<DataEntryForm>;
    sections?: Array<Section>;
    charts?: Array<Dictionary<any>>;
    reportTables?: Array<Dictionary<any>>;
    dashboards?: Array<Dictionary<any>>;
}

export interface MetadataOptions {
    importStrategy?: "CREATE_AND_UPDATE" | "CREATE" | "UPDATE" | "DELETE";
}

export interface Section {
    id: string;
    name: string;
    code?: string;
    showRowTotals?: boolean;
    showColumnTotals?: boolean;
    dataSet?: Ref;
    dataElements?: Ref[];
    greyedFields?: Array<{
        categoryOptionCombo: Ref;
        dataElement: Ref;
    }>;
}

export interface DataSet {
    id: string;
    name: string;
    description: string;
    publicAccess: string;
    periodType: string;
    categoryCombo: Ref;
    dataElementDecoration: boolean;
    renderAsTabs: boolean;
    organisationUnits: Ref[];
    dataSetElements: Array<{ dataSet: Ref; dataElement: Ref; categoryCombo: Ref }>;
    openFuturePeriods: number;
    timelyDays: number;
    expiryDays: number;
    sections: Ref[];
    dataInputPeriods: DataInputPeriod[];
    attributeValues: AttributeValue[];
    formType: "DEFAULT" | "CUSTOM";
    dataEntryForm?: Ref;
}

export interface DataSetElement {
    dataSet: Ref;
    dataElement: Ref;
    categoryCombo: Ref;
}

export interface DataEntryForm {
    id: string;
    name: string;
    htmlCode: string;
    style: "NORMAL" | "COMFORTABLE" | "COMPACT" | "NONE";
}

export interface DataInputPeriod {
    openingDate: string;
    closingDate: string;
    period: { id: string };
}

export interface ImportParams {
    userOverrideMode: string;
    importMode: string;
    identifier: string;
    preheatMode: string;
    importStrategy: string;
    atomicMode: string;
    mergeMode: string;
    flushMode: string;
    skipSharing: boolean;
    skipValidation: boolean;
    username: string;
}

export interface Stats {
    created: number;
    updated: number;
    deleted: number;
    ignored: number;
    total: number;
}

export interface ErrorReport {
    message: string;
    mainKlass: string;
    errorKlass: string;
    errorProperty: string;
    errorCode: string;
}

export interface ObjectReport {
    klass: string;
    index: number;
    uid: string;
    errorReports: ErrorReport[];
}

export interface TypeReport {
    klass: string;
    stats: Stats;
    objectReports: ObjectReport[];
}

export interface MetadataResponse {
    importParams: ImportParams;
    status: "OK" | "ERROR";
    stats: Stats;
    typeReports: TypeReport[];
}

export interface Dashboard {
    id: string;
    dashboardItems: Array<{
        id: string;
        chart: { id: string };
        map: { id: string };
        reportTable: { id: string };
    }>;
}

export interface DataValue {
    dataSet?: string;
    completeDate?: string;
    period?: string;
    orgUnit: string;
    attributeOptionCombo?: string;

    dataElement: string;
    categoryOptionCombo?: string;
    value: string;
    comment?: string;
}

export interface DataValueRequest {
    dataSet?: string;
    completeDate?: string;
    period?: string;
    orgUnit: string;
    attributeOptionCombo?: string;
    dataValues: Array<{
        dataElement: string;
        categoryOptionCombo?: string;
        value: string;
        comment?: string;
    }>;
}

export interface DataValueResponse {
    responseType: "ImportSummary";
    status: "SUCCESS" | "ERROR";
    description: string;
}

export type MetadataFields = { [key in ModelName]: ModelFields };

export interface ModelFields {
    [key: string]: boolean | ModelFields | ((fields: MetadataFields) => ModelFields);
}

export type ModelName =
    | "attributeValues"
    | "attributes"
    | "attributes"
    | "categories"
    | "categoryCombos"
    | "categoryOptionCombos"
    | "categoryOptions"
    | "categoryOptionGroups"
    | "dashboards"
    | "dataElements"
    | "dataElementGroups"
    | "dataSets"
    | "dataSetElements"
    | "dataInputPeriods"
    | "organisationUnits"
    | "organisationUnitLevels"
    | "sections"
    | "userRoles";

export interface MetadataGetModelParams {
    fields?: ModelFields;
    filters?: string[];
}

export type MetadataGetParams = { [key in ModelName]?: MetadataGetModelParams };

export interface CategoryCustom {
    id: string;
    categoryOptions: CategoryOption[];
}

export interface DataElementItemCustom {
    id: string;
    code: string;
}

export interface CategoryOptionsCustom {
    id: string;
    categories: Array<{ id: string; code: string }>;
    organisationUnits: Ref[];
}

export interface OrganisationUnitWithName {
    id: string;
    displayName: string;
    path: string;
}

export interface DashboardMetadataRequest {
    categories: CategoryCustom[];
    dataElements: DataElementItemCustom[];
    indicators: DataElementItemCustom[];
    categoryOptions: CategoryOptionsCustom[];
    organisationUnits: OrganisationUnitWithName[];
}
