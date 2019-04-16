import { MetadataConfig } from "../config";

const metadataConfig: MetadataConfig = {
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
    organisationUnitLevels: [],
    categoryCombos: [],
    categories: [
        {
            name: "Antigens",
            code: "RVC_ANTIGENS",
            dataDimensionType: "DISAGGREGATION",
            dataDimension: false,
            $categoryOptions: { kind: "fromAntigens" },
        },
        {
            name: "Age group",
            code: "RVC_AGE_GROUP",
            dataDimensionType: "DISAGGREGATION",
            dataDimension: true,
            $categoryOptions: { kind: "fromAgeGroups" },
        },
        {
            name: "Teams",
            code: "RVC_TEAMS",
            dataDimensionType: "ATTRIBUTE",
            dataDimension: true,
            $categoryOptions: {
                kind: "values",
                values: ["Team 1", "Team 2", "Team 3", "Team 4", "Team 5"],
            },
        },
        {
            name: "Gender",
            code: "RVC_GENDER",
            dataDimensionType: "DISAGGREGATION",
            dataDimension: true,
            $categoryOptions: { kind: "values", values: ["Female", "Male"] },
        },
        {
            name: "Severity",
            code: "RVC_SEVERITY",
            dataDimensionType: "DISAGGREGATION",
            dataDimension: true,
            $categoryOptions: { kind: "values", values: ["Minor", "Severe"] },
        },
        {
            name: "Displacement Status",
            code: "RVC_DISPLACEMENT_STATUS",
            dataDimensionType: "DISAGGREGATION",
            dataDimension: true,
            $categoryOptions: { kind: "values", values: ["Host", "IDP", "Refugees"] },
        },
        {
            name: "Demographic age distribution",
            code: "RVC_DEMOGRAPHIC_AGE",
            dataDimensionType: "DISAGGREGATION",
            dataDimension: false,
            $categoryOptions: { kind: "values", values: [] },
        },
    ],
    population: {
        totalPopulationDataElement: {
            id: "1",
            code: "CODE",
            displayName: "Total population",
            categoryCombo: { id: "1" },
        },
        ageDistributionDataElement: {
            id: "2",
            code: "CODE",
            displayName: "Age distribution (%)",
            categoryCombo: { id: "1" },
        },
        populationByAgeDataElement: {
            id: "3",
            code: "CODE",
            displayName: "Population By age",
            categoryCombo: { id: "1" },
        },
        ageGroupCategory: {
            id: "1",
            code: "RVC_AGE_GROUP",
            displayName: "Age Group",
            categoryOptions: [],
            dataDimensionType: "DISAGGREGATION",
            dataDimension: true,
        },
    },
    dataElements: [
        {
            id: "1",
            name: "Vaccine doses administered",
            code: "RVC_DOSES_ADMINISTERED",
            categories: [
                { code: "RVC_AGE_GROUP", optional: false },
                { code: "RVC_GENDER", optional: true },
                { code: "RVC_DISPLACEMENT_STATUS", optional: true },
            ],
        },
        {
            id: "2",
            name: "Vaccine doses used",
            code: "RVC_USED",
            categories: [],
        },
        {
            id: "3",
            name: "ADS used",
            code: "RVC_ADS_USED",
            categories: [],
        },
        {
            id: "4",
            name: "Syringes for dilution",
            code: "RVC_SYRINGES",
            categories: [],
        },
        {
            id: "5",
            name: "Needles doses used",
            code: "RVC_NEEDLES",
            categories: [],
        },
        {
            id: "6",
            name: "Safety boxes",
            code: "RVC_SAFETY_BOXES",
            categories: [],
        },
        {
            id: "7",
            name: "Accidental Exposure to Blood (AEB)",
            code: "RVC_AEB",
            categories: [],
        },
        {
            id: "8",
            name: "Adverse Event Following Immunization",
            code: "RVC_AEFI",
            categories: [{ code: "RVC_SEVERITY", optional: true }],
        },
    ],
    antigens: [
        {
            name: "Measles",
            code: "RVC_MEASLES",
            dataElements: [
                { code: "RVC_DOSES_ADMINISTERED", optional: false },
                { code: "RVC_DOSES_USED", optional: false },
                { code: "RVC_ADS_USED", optional: true },
                { code: "RVC_SYRINGES", optional: false },
                { code: "RVC_NEEDLES", optional: false },
                { code: "RVC_SAFETY_BOXES", optional: false },
                { code: "RVC_AEB", optional: false },
                { code: "RVC_AEFI", optional: false },
            ],
            ageGroups: [
                [["6 - 8 m"]],
                [["9 - 11 m"]],
                [["12 - 59 m"], ["12 - 23 m", "24 - 59 m"]],
                [["5 - 14 y"], ["5 - 9 y", "5 - 12 y"]],
            ],
        },
        {
            name: "Meningitis Polysaccharide",
            code: "RVC_MENPOLY",
            dataElements: [
                { code: "RVC_DOSES_ADMINISTERED", optional: false },
                { code: "RVC_DOSES_USED", optional: false },
                { code: "RVC_ADS_USED", optional: false },
                { code: "RVC_SYRINGES", optional: false },
                { code: "RVC_NEEDLES", optional: false },
                { code: "RVC_SAFETY_BOXES", optional: false },
                { code: "RVC_AEB", optional: false },
                { code: "RVC_AEFI", optional: false },
            ],
            ageGroups: [[["2 - 4 y"]], [["5 - 14 y"]], [["15 - 29 y"]]],
        },
        {
            name: "Meningitis Conjugate",
            code: "RVC_MENCONJ",
            dataElements: [
                { code: "RVC_DOSES_ADMINISTERED", optional: false },
                { code: "RVC_DOSES_USED", optional: false },
                { code: "RVC_ADS_USED", optional: true },
                { code: "RVC_SYRINGES", optional: true },
                { code: "RVC_NEEDLES", optional: true },
                { code: "RVC_SAFETY_BOXES", optional: true },
                { code: "RVC_AEB", optional: true },
                { code: "RVC_AEFI", optional: true },
            ],
            ageGroups: [[["12 - 59 m"]], [["5 - 14 y"]], [["15 - 29 y", "15 - 19 y"]]],
        },
        {
            name: "Cholera",
            code: "RVC_CHOLERA",
            dataElements: [
                { code: "RVC_DOSES_ADMINISTERED", optional: false },
                { code: "RVC_DOSES_USED", optional: false },
                { code: "RVC_AEFI", optional: false },
            ],
            ageGroups: [[["12 - 59 m"]], [["5 - 14 y"]], [["15 - 99 y"], ["15 - 29 y", "> 30 y"]]],
        },
        {
            name: "PCV",
            code: "RVC_PCV",
            dataElements: [
                { code: "RVC_DOSES_ADMINISTERED", optional: false },
                { code: "RVC_DOSES_USED", optional: false },
                { code: "RVC_ADS_USED", optional: false },
                { code: "RVC_SAFETY_BOXES", optional: false },
                { code: "RVC_AEB", optional: false },
                { code: "RVC_AEFI", optional: false },
            ],
            ageGroups: [
                [["6 w - 11 m"]],
                [["12 - 23 m"]],
                [["24 - 59 m"]],
                [["5 - 14 y"], ["5 - 7 y", "8 - 14 y"]],
            ],
        },
        {
            name: "Pertussis Penta",
            code: "RVC_PERTPENTA",
            dataElements: [
                { code: "RVC_DOSES_ADMINISTERED", optional: false },
                { code: "RVC_DOSES_USED", optional: false },
                { code: "RVC_ADS_USED", optional: false },
                { code: "RVC_SAFETY_BOXES", optional: false },
                { code: "RVC_AEB", optional: false },
                { code: "RVC_AEFI", optional: false },
            ],
            ageGroups: [
                [["6 w - 11 m"]],
                [["12 - 23 m"]],
                [["24 - 59 m"]],
                [["5 - 14 y"], ["5 - 7 y", "8 - 14 y"]],
            ],
        },
        {
            name: "Yellow Fever",
            code: "RVC_YELLOW_FEVER",
            dataElements: [
                { code: "RVC_DOSES_ADMINISTERED", optional: false },
                { code: "RVC_DOSES_USED", optional: false },
                { code: "RVC_ADS_USED", optional: false },
                { code: "RVC_SYRINGES", optional: false },
                { code: "RVC_NEEDLES", optional: false },
                { code: "RVC_SAFETY_BOXES", optional: false },
                { code: "RVC_AEB", optional: false },
                { code: "RVC_AEFI", optional: false },
            ],
            ageGroups: [
                [
                    ["9 - 59 m"],
                    ["9 - 11 m", "12 - 23 m", "25 - 59 m"],
                    ["12 - 59 m"],
                    ["12 - 23 m", "25 - 59 m"],
                ],
                [["12 - 23 m"]],
                [["5 - 14 y"]],
                [["15 - 99 y"], ["15 - 29 y", ">30 y"]],
            ],
        },
        {
            name: "Japanese Encephalitis",
            code: "RVC_JPENC",
            dataElements: [
                { code: "RVC_DOSES_ADMINISTERED", optional: false },
                { code: "RVC_DOSES_USED", optional: false },
                { code: "RVC_ADS_USED", optional: false },
                { code: "RVC_SYRINGES", optional: true },
                { code: "RVC_NEEDLES", optional: true },
                { code: "RVC_SAFETY_BOXES", optional: false },
                { code: "RVC_AEB", optional: false },
                { code: "RVC_AEFI", optional: false },
            ],
            ageGroups: [
                [["8 - 11 m"], ["9 - 11 m"], ["6 - 11 m"]],
                [["12 - 59 m"]],
                [["5 - 14 y"]],
                [["15 - 29 y"]],
            ],
        },
        {
            name: "Dengue",
            code: "RVC_DENGUE",
            dataElements: [
                { code: "RVC_DOSES_ADMINISTERED", optional: false },
                { code: "RVC_DOSES_USED", optional: false },
                { code: "RVC_ADS_USED", optional: false },
                { code: "RVC_SYRINGES", optional: true },
                { code: "RVC_NEEDLES", optional: true },
                { code: "RVC_SAFETY_BOXES", optional: false },
                { code: "RVC_AEB", optional: false },
                { code: "RVC_AEFI", optional: false },
            ],
            ageGroups: [[["9 - 14 y"]], [["15 - 29 y"]]],
        },
        {
            name: "Typhoid Fever",
            code: "RVC_TYPHOID_FEVER",
            dataElements: [
                { code: "RVC_DOSES_ADMINISTERED", optional: false },
                { code: "RVC_DOSES_USED", optional: false },
                { code: "RVC_ADS_USED", optional: false },
                { code: "RVC_SYRINGES", optional: true },
                { code: "RVC_NEEDLES", optional: true },
                { code: "RVC_SAFETY_BOXES", optional: false },
                { code: "RVC_AEB", optional: false },
                { code: "RVC_AEFI", optional: false },
            ],
            ageGroups: [
                [["6 - 11 m"]],
                [["12 - 59 m"]],
                [["5 - 14 y"]],
                [["15 - 45 y"], ["15 - 29 y", "30 - 45 y"]],
            ],
        },
    ],
};

export default metadataConfig;
