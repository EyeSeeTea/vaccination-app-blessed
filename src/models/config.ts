import _ from "lodash";
import "../utils/lodash-mixins";
import DbD2 from "./db-d2";
import {
    Category,
    DataElementGroup,
    CategoryCombo,
    CategoryOptionGroup,
    DataElement,
    OrganisationUnitLevel,
    Ref,
} from "./db.types";

export interface BaseConfig {
    categoryCodeForAntigens: string;
    categoryCodeForAgeGroup: string;
    categoryComboCodeForAgeGroup: string;
    categoryComboCodeForAntigenAgeGroup: string;
    dataElementGroupCodeForAntigens: string;
    categoryComboCodeForTeams: string;
    categoryCodeForTeams: string;
    attibuteCodeForApp: string;
    attributeCodeForDashboard: string;
    dataElementCodeForTotalPopulation: string;
    dataElementCodeForAgeDistribution: string;
    dataElementCodeForPopulationByAge: string;
}

const baseConfig: BaseConfig = {
    categoryCodeForAntigens: "RVC_ANTIGEN",
    categoryCodeForAgeGroup: "RVC_AGE_GROUP",
    categoryComboCodeForAgeGroup: "RVC_AGE_GROUP",
    categoryComboCodeForAntigenAgeGroup: "RVC_ANTIGEN_RVC_AGE_GROUP",
    dataElementGroupCodeForAntigens: "RVC_ANTIGEN",
    categoryComboCodeForTeams: "RVC_TEAM",
    categoryCodeForTeams: "RVC_TEAM",
    attibuteCodeForApp: "RVC_CREATED_BY_VACCINATION_APP",
    attributeCodeForDashboard: "RVC_DASHBOARD_ID",
    dataElementCodeForTotalPopulation: "RVC_TOTAL_POPULATION",
    dataElementCodeForAgeDistribution: "RVC_AGE_DISTRIBUTION",
    dataElementCodeForPopulationByAge: "RVC_POPULATION_BY_AGE",
};

export interface MetadataConfig extends BaseConfig {
    organisationUnitLevels: OrganisationUnitLevel[];
    categories: Array<{
        name: string;
        code: string;
        dataDimensionType: "DISAGGREGATION" | "ATTRIBUTE";
        dataDimension: boolean;
        $categoryOptions:
            | { kind: "fromAntigens" }
            | { kind: "fromAgeGroups" }
            | { kind: "values"; values: string[] };
    }>;
    categoryCombos: CategoryCombo[];
    population: {
        totalPopulationDataElement: DataElement;
        ageDistributionDataElement: DataElement;
        populationByAgeDataElement: DataElement;
        ageGroupCategory: Category;
    };
    dataElements: Array<{
        name: string;
        code: string;
        id: string;
        categories: { code: string; optional: boolean }[];
    }>;
    antigens: Array<{
        name: string;
        code: string;
        dataElements: { code: string; optional: boolean }[];
        ageGroups: Array<string[][]>;
    }>;
}

function getConfigCategories(categories: Category[]): MetadataConfig["categories"] {
    return categories.map(category => {
        let $categoryOptions: MetadataConfig["categories"][0]["$categoryOptions"];

        if (category.code === baseConfig.categoryCodeForAntigens) {
            $categoryOptions = { kind: "fromAntigens" };
        } else if (category.code === baseConfig.categoryCodeForAgeGroup) {
            $categoryOptions = { kind: "fromAgeGroups" };
        } else {
            $categoryOptions = {
                kind: "values",
                values: category.categoryOptions.map(co => co.displayName),
            };
        }

        return {
            name: category.displayName,
            code: category.code,
            dataDimensionType: category.dataDimensionType,
            dataDimension: category.dataDimension,
            $categoryOptions,
        };
    });
}

function getCode(parts: string[]): string {
    return parts.map(part => part.replace(/\s*/g, "").toUpperCase()).join("_");
}

function getFromRefs<T>(refs: Ref[], objects: T[]): T[] {
    const objectsById = _.keyBy(objects, "id");
    return refs.map(ref => _(objectsById).getOrFail(ref.id));
}

function getConfigDataElements(
    dataElementGroups: DataElementGroup[],
    dataElements: DataElement[],
    categoryCombos: CategoryCombo[],
    categories: Category[]
): MetadataConfig["dataElements"] {
    const groupsByCode = _.keyBy(dataElementGroups, "code");
    const catCombosByCode = _.keyBy(categoryCombos, "code");
    const dataElementsForAntigens = getFromRefs(
        _(groupsByCode).getOrFail("RVC_ANTIGEN").dataElements,
        dataElements
    );

    return dataElementsForAntigens.map(dataElement => {
        const getCategories = (typeString: string): Category[] => {
            const code = "RVC_DE_" + dataElement.code + "_" + typeString;
            const categoryRefs = (catCombosByCode[code] || { categories: [] }).categories;
            return getFromRefs(categoryRefs, categories);
        };

        const categoriesForAntigens = _.concat(
            getCategories("REQUIRED").map(({ code }) => ({ code, optional: false })),
            getCategories("OPTIONAL").map(({ code }) => ({ code, optional: true }))
        );

        return {
            id: dataElement.id,
            name: dataElement.displayName,
            code: dataElement.code,
            categories: categoriesForAntigens,
        };
    });
}

function sortAgeGroups(names: string[]) {
    const timeUnits: _.Dictionary<number> = { d: 1, w: 7, m: 30, y: 365 };
    const getOrThrow = _.getOrFail;

    return _.sortBy(names, name => {
        const parts = name.split(" ");
        let pair;
        if (parts.length === 4) {
            // "2 - 5 y"
            const days = getOrThrow(timeUnits, parts[3]);
            pair = [parseInt(parts[0]) * days, parseInt(parts[2]) * days];
        } else if (parts.length === 5) {
            // "2 w - 3 y" {
            const days1 = getOrThrow(timeUnits, parts[1]);
            const days2 = getOrThrow(timeUnits, parts[4]);
            pair = [parseInt(parts[0]) * days1, parseInt(parts[3]) * days2];
        } else if (parts.length === 3) {
            // ""> 30 y"
            const days = getOrThrow(timeUnits, parts[2]);
            pair = [parseInt(parts[1]) * days, 0];
        } else {
            throw new Error(`Invalid age range format: ${name}`);
        }

        return 100000 * pair[0] + pair[1];
    });
}

function getAntigens(
    dataElementGroups: DataElementGroup[],
    dataElements: DataElement[],
    categories: Category[],
    categoryOptionGroups: CategoryOptionGroup[]
): MetadataConfig["antigens"] {
    const categoriesByCode = _.keyBy(categories, "code");
    const categoryOptions = _(categoriesByCode).getOrFail("RVC_ANTIGEN").categoryOptions;
    const dataElementGroupsByCode = _.keyBy(dataElementGroups, "code");
    const categoryOptionGroupsByCode = _.keyBy(categoryOptionGroups, "code");

    const antigensMetadata = categoryOptions.map(categoryOption => {
        const getDataElements = (typeString: string) => {
            const code = getCode([categoryOption.code, typeString]);
            return getFromRefs(
                _(dataElementGroupsByCode).getOrFail(code).dataElements,
                dataElements
            );
        };

        const dataElementsForAntigens = _.concat(
            getDataElements("REQUIRED").map(({ code }) => ({ code, optional: false })),
            getDataElements("OPTIONAL").map(({ code }) => ({ code, optional: true }))
        );

        const dataElementSorted = _(dataElementsForAntigens)
            .orderBy([de => de.code.match(/DOSES/), "code"], ["asc", "asc"])
            .value();

        const mainAgeGroups = _(categoryOptionGroupsByCode)
            .getOrFail(getCode([categoryOption.code, "AGE_GROUP"]))
            .categoryOptions.map(co => co.displayName);

        const ageGroups = sortAgeGroups(mainAgeGroups).map(mainAgeGroup => {
            const codePrefix = getCode([categoryOption.code, "AGE_GROUP", mainAgeGroup]);
            const disaggregatedAgeGroups = _(categoryOptionGroups)
                .filter(cog => cog.code.startsWith(codePrefix))
                .sortBy(cog => cog.code)
                .map(cog => sortAgeGroups(cog.categoryOptions.map(co => co.displayName)))
                .value();
            return [[mainAgeGroup], ...disaggregatedAgeGroups];
        });

        return {
            name: categoryOption.displayName,
            code: categoryOption.code,
            dataElements: dataElementSorted,
            ageGroups: ageGroups,
        };
    });

    return antigensMetadata;
}

function getPopulationMetadata(
    dataElements: DataElement[],
    categories: Category[]
): MetadataConfig["population"] {
    const codes = [
        baseConfig.dataElementCodeForTotalPopulation,
        baseConfig.dataElementCodeForAgeDistribution,
        baseConfig.dataElementCodeForPopulationByAge,
    ];
    const [totalPopulationDataElement, ageDistributionDataElement, populationByAgeDataElement] = _(
        dataElements
    )
        .keyBy(de => de.code)
        .at(codes)
        .value();

    const ageGroupCategory = _(categories)
        .keyBy("code")
        .getOrFail(baseConfig.categoryCodeForAgeGroup);
    return {
        totalPopulationDataElement,
        ageDistributionDataElement,
        populationByAgeDataElement,
        ageGroupCategory,
    };
}

export async function getMetadataConfig(db: DbD2): Promise<MetadataConfig> {
    const codeFilter = "code:startsWith:RVC_";
    const modelParams = { filters: [codeFilter] };

    const metadataParams = {
        categories: modelParams,
        categoryCombos: modelParams,
        categoryOptionGroups: modelParams,
        dataElementGroups: modelParams,
        dataElements: modelParams,
        organisationUnitLevels: {},
    };

    const metadata = await db.getMetadata<{
        categories: Category[];
        categoryCombos: CategoryCombo[];
        categoryOptionGroups: CategoryOptionGroup[];
        dataElementGroups: DataElementGroup[];
        dataElements: DataElement[];
        organisationUnitLevels: OrganisationUnitLevel[];
    }>(metadataParams);

    const metadataConfig = {
        ...baseConfig,
        organisationUnitLevels: metadata.organisationUnitLevels,
        categories: getConfigCategories(metadata.categories),
        categoryCombos: metadata.categoryCombos,
        dataElements: getConfigDataElements(
            metadata.dataElementGroups,
            metadata.dataElements,
            metadata.categoryCombos,
            metadata.categories
        ),
        antigens: getAntigens(
            metadata.dataElementGroups,
            metadata.dataElements,
            metadata.categories,
            metadata.categoryOptionGroups
        ),
        population: getPopulationMetadata(metadata.dataElements, metadata.categories),
    };

    return metadataConfig;
}
