import { Metadata } from "./db.types";
import { Dictionary } from "lodash";
export type Maybe<T> = T | undefined;

export type Response<T> = { status: true } | { status: false; error: T };

type Partial<T> = { [P in keyof T]?: T[P] };

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
    categories: Category[];
    categoryOptionCombos: { id: string; name: string; categoryOptions: Ref[] }[];
}

export interface Attribute {
    id: string;
}

export interface AttributeValue {
    value: string;
    attribute: Ref;
}

export interface DataElement {
    id: string;
    code: string;
    displayName: string;
    categoryCombo: CategoryCombo;
}

export interface DataElementGroup {
    id: string;
    code: string;
    displayName: string;
    dataElements: DataElement[];
}

export interface Ref {
    id: string;
}

export interface Metadata {
    dataSets?: Array<DataSet>;
    sections?: Array<Section>;
}

export interface Section {
    name: string;
    showRowTotals: boolean;
    showColumnTotals: boolean;
    dataSet: Ref;
    dataElements: Ref[];
}

export interface DataSet {
    id: string;
    name: string;
    publicAccess: string;
    periodType: string;
    categoryCombo: Ref;
    dataElementDecoration: boolean;
    renderAsTabs: boolean;
    organisationUnits: Array<Ref>;
    dataSetElements: Array<{ dataSet: Ref; dataElement: Ref; categoryCombo: Ref }>;
    openFuturePeriods: number;
    timelyDays: number;
    expiryDays: number;
    sections?: Section[];
    dataInputPeriods: DataInputPeriod[];
    attributeValues: AttributeValue[];
    formType: "DEFAULT" | "CUSTOM";
}

export interface DataEntryForm {
    id: string;
    name: string;
    htmlCode: string;
    style: "NORMAL" | "COMFORTABLE" | "COMPACT" | "NONE";
}

export interface DataInputPeriod {
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

export type MetadataFields = { [key in ModelName]: ModelFields };

export interface ModelFields {
    [key: string]: boolean | ModelFields | ((fields: MetadataFields) => ModelFields);
}

export type ModelName =
    | "categories"
    | "categoryCombos"
    | "categoryOptions"
    | "categoryOptionGroups"
    | "dataElements"
    | "dataElementGroups";

export interface MetadataGetModelParams {
    filters?: string[];
}

export type MetadataGetParams = { [key in ModelName]?: MetadataGetModelParams | undefined };
