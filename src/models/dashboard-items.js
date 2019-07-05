import _ from "lodash";
import { generateUid } from "d2/uid";
import moment from "moment";

export const dashboardItemsConfig = {
    metadataToFetch: {
        INDICATOR: [
            "RVC_ADS_WASTAGE",
            "RVC_DILUTION_SYRINGES_RATIO",
            "RVC_SAFETY_BOXES",
            "RVC_CAMPAIGN_COVERAGE",
            "RVC_VACCINE_UTILIZATION",
            "RVC_CAMPAIGN_NEEDLES_RATIO",
        ],
        DATA_ELEMENT: ["RVC_AEB", "RVC_AEFI", "RVC_DOSES_ADMINISTERED", "RVC_DOSES_USED"],
    },
    chartsByAntigen: {
        coverageBySite: {
            elements: ["RVC_CAMPAIGN_COVERAGE"],
            disaggregatedBy: ["doses"],
            type: "COLUMN",
            rows: ["ou"],
            filterDataBy: ["pe"],
            area: false,
            title: period => `Coverage by Site ${period}`,
            appendCode: "coverageBySiteChart",
        },
        coverageByArea: {
            elements: ["RVC_CAMPAIGN_COVERAGE"],
            disaggregatedBy: ["doses"],
            type: "COLUMN",
            rows: ["ou"],
            filterDataBy: ["pe"],
            area: true,
            title: period => `Coverage by Area ${period}`,
            appendCode: "coverageByAreaChart",
        },
    },
    globalTables: {
        globalQsIndicators: {
            elements: [
                "RVC_ADS_WASTAGE",
                "RVC_DILUTION_SYRINGES_RATIO",
                "RVC_SAFETY_BOXES",
                "RVC_CAMPAIGN_NEEDLES_RATIO",
            ],
            rows: ["ou"],
            filterDataBy: ["pe"],
            disaggregatedBy: [],
            area: true,
            title: "Global QS Indicators",
            appendCode: "globalQsTable",
        },
        aefiAEB: {
            elements: ["RVC_AEB", "RVC_AEFI"],
            rows: ["pe"],
            filterDataBy: ["ou"],
            disaggregatedBy: [],
            area: false,
            title: "AEFI and AEB indicators",
            appendCode: "adverseEvents",
            legendCode: "RVC_LEGEND_ZERO",
        },
    },
    tablesByAntigen: {
        coverageByAreaTable: {
            elements: ["RVC_DOSES_ADMINISTERED", "RVC_CAMPAIGN_COVERAGE"],
            rows: ["ou"],
            filterDataBy: ["pe"],
            disaggregatedBy: ["ageGroup", "doses"],
            area: true,
            title: "Campaign Coverage by Area",
            appendCode: "coverageByArea",
            showRowSubTotals: false,
        },
        qsPerAntigen: {
            elements: ["RVC_DILUTION_SYRINGES_RATIO", "RVC_CAMPAIGN_NEEDLES_RATIO"],
            rows: ["pe", "team"],
            filterDataBy: ["ou"],
            disaggregatedBy: [],
            area: false,
            title: "QS Indicators",
            appendCode: "qsIndicatorsTable",
        },
        vaccinesPerArea: {
            elements: ["RVC_DOSES_ADMINISTERED", "RVC_DOSES_USED", "RVC_VACCINE_UTILIZATION"],
            rows: ["ou"],
            filterDataBy: ["pe"],
            disaggregatedBy: [],
            area: true,
            title: "Vaccines Per Area",
            appendCode: "vaccinesPerArea",
        },
        vaccinesPerDateTeam: {
            elements: ["RVC_DOSES_ADMINISTERED", "RVC_DOSES_USED", "RVC_VACCINE_UTILIZATION"],
            rows: ["pe", "team"],
            filterDataBy: ["ou"],
            disaggregatedBy: [],
            area: false,
            title: "Vaccines Per Team",
            appendCode: "vaccinesPerDateTeam",
        },
    },
    tablesByAntigenAndSite: {
        coverageByPeriod: {
            elements: ["RVC_DOSES_ADMINISTERED", "RVC_CAMPAIGN_COVERAGE"],
            rows: ["pe"],
            filterDataBy: ["ou"],
            disaggregatedBy: ["ageGroup", "doses"],
            area: false,
            title: "Campaign Coverage by day",
            appendCode: "coverageByPeriod",
            showRowSubTotals: false,
        },
    },
};

export function buildDashboardItemsCode(datasetName, orgUnitName, antigenName, appendCode) {
    return [datasetName, orgUnitName, antigenName, appendCode].join("_");
}

function getDisaggregations(itemConfigs, disaggregationMetadata, antigen) {
    if (!itemConfigs.disaggregatedBy) return [];

    const ageGroups = c =>
        c.disaggregatedBy.includes("ageGroup") && antigen
            ? disaggregationMetadata.ageGroups(antigen)
            : null;

    const teams = c => (c.disaggregatedBy.includes("team") ? disaggregationMetadata.teams() : null);

    const doses = c => {
        if (c.disaggregatedBy.includes("doses") && antigen) {
            const dosesDisaggregation = disaggregationMetadata.doses(antigen);
            return dosesDisaggregation.elements.length === 1 ? null : dosesDisaggregation;
        } else {
            return null;
        }
    };

    return _.compact([teams(itemConfigs), ageGroups(itemConfigs), doses(itemConfigs)]);
}

function getCharts({
    charts,
    antigen,
    elements,
    organisationUnits,
    itemsMetadata,
    disaggregationMetadata,
}) {
    return _(charts)
        .map((chart, key) =>
            chartConstructor({
                id: generateUid(),
                antigen,
                data: elements[key],
                type: chart.type,
                appendCode: chart.appendCode,
                organisationUnits,
                title: chart.title,
                area: !!chart.area,
                rows: chart.rows,
                filterDataBy: chart.filterDataBy,
                ...itemsMetadata,
                disaggregations: getDisaggregations(chart, disaggregationMetadata, antigen),
            })
        )
        .value();
}

function getTables({
    tables,
    antigen,
    elements,
    organisationUnits,
    itemsMetadata,
    disaggregationMetadata,
    legendsMetadata,
}) {
    return _(tables)
        .map((c, key) => {
            const teamMetadata = disaggregationMetadata.teams();

            const rows = c.rows.map(row => (row === "team" ? teamMetadata.categoryId : row));
            const teamRowRawDimension = _.some(c.rows, r => r === "team") ? teamMetadata : null;

            const legendId = c.legendCode ? legendsMetadata.get(c.legendCode) : null;
            return tableConstructor({
                id: generateUid(),
                antigen,
                data: elements[key],
                appendCode: c.appendCode,
                rows,
                filterDataBy: c.filterDataBy,
                organisationUnits,
                title: c.title,
                area: !!c.area,
                legendId,
                teamRowRawDimension,
                ...itemsMetadata,
                disaggregations: getDisaggregations(c, disaggregationMetadata, antigen),
                showRowSubTotals: c.showRowSubTotals,
            });
        })
        .value();
}

export function buildDashboardItems(
    antigensMeta,
    datasetName,
    organisationUnitsMetadata,
    periodItems,
    antigenCategory,
    disaggregationMetadata,
    elements,
    legendsMetadata
) {
    const itemsMetadata = {
        datasetName,
        periodItems,
        antigenCategory,
    };

    const {
        globalTables: globalTablesMetadata,
        tablesByAntigen: tablesByAntigenMetadata,
        tablesByAntigenAndSite: tablesByAntigenAndSiteMetadata,
        chartsByAntigen: chartsByAntigenMetadata,
    } = dashboardItemsConfig;

    const tablesByAntigen = _(antigensMeta)
        .flatMap(antigen =>
            getTables({
                tables: tablesByAntigenMetadata,
                antigen,
                elements,
                organisationUnits: organisationUnitsMetadata,
                itemsMetadata,
                disaggregationMetadata,
                legendsMetadata,
            })
        )
        .value();

    const tablesByAntigenAndSite = _(antigensMeta)
        .flatMap(antigen =>
            organisationUnitsMetadata.map(ou =>
                getTables({
                    tables: tablesByAntigenAndSiteMetadata,
                    antigen,
                    elements,
                    organisationUnits: [ou],
                    itemsMetadata,
                    disaggregationMetadata,
                    legendsMetadata,
                })
            )
        )
        .flatten()
        .value();

    const globalTables = getTables({
        tables: globalTablesMetadata,
        antigen: null,
        elements,
        organisationUnits: organisationUnitsMetadata,
        itemsMetadata,
        disaggregationMetadata,
        legendsMetadata,
    });

    const reportTables = _.concat(globalTables, tablesByAntigen, tablesByAntigenAndSite);

    const chartsByAntigen = _(antigensMeta)
        .flatMap(antigen =>
            getCharts({
                charts: chartsByAntigenMetadata,
                antigen,
                elements,
                organisationUnits: organisationUnitsMetadata,
                itemsMetadata,
                disaggregationMetadata,
            })
        )
        .value();

    return { charts: chartsByAntigen, reportTables };
}

const dataMapper = (elementsMetadata, filterList) =>
    _(elementsMetadata)
        .map(dataList => {
            return dataList.data
                .filter(({ code }) => _.includes(filterList, code))
                .map(({ id }) => ({
                    dataDimensionItemType: dataList.type,
                    [dataList.key]: { id },
                }));
        })
        .flatten()
        .value();

export function itemsMetadataConstructor(dashboardItemsMetadata) {
    const { elementsMetadata, antigenCategory, disaggregationMetadata } = dashboardItemsMetadata;

    const {
        globalTables,
        tablesByAntigen,
        tablesByAntigenAndSite,
        chartsByAntigen,
    } = dashboardItemsConfig;

    const allTables = { ...globalTables, ...tablesByAntigen, ...tablesByAntigenAndSite };
    const tableElements = _(allTables)
        .map((item, key) => [key, dataMapper(elementsMetadata, item.elements)])
        .fromPairs()
        .value();

    const chartElements = _(chartsByAntigen)
        .map((item, key) => [key, dataMapper(elementsMetadata, item.elements)])
        .fromPairs()
        .value();

    const dashboardItemsElements = {
        antigenCategory,
        disaggregationMetadata,
        ...tableElements,
        ...chartElements,
    };
    return dashboardItemsElements;
}

function getDimensions(disaggregations, antigen, antigenCategory) {
    const antigenCategoryDimension = antigen
        ? {
              category: { id: antigenCategory },
              categoryOptions: [{ id: antigen.id }],
          }
        : {};

    const noDisaggregationDimension = {
        categoryDimensions: antigenCategoryDimension,
        columns: { id: "dx" },
        columnDimensions: "dx",
    };

    if (_.isEmpty(disaggregations)) return _.mapValues(noDisaggregationDimension, dis => [dis]);

    const disaggregationDimensions = disaggregations.map(d => ({
        categoryDimensions: {
            category: {
                id: d.categoryId,
            },
            categoryOptions: d.elements.map(e => ({ id: e })),
        },
        columns: { id: d.categoryId },
        columnDimensions: d.categoryId,
    }));

    const keys = ["categoryDimensions", "columns", "columnDimensions"];

    const allDimensions = [noDisaggregationDimension, ...disaggregationDimensions];

    return _(keys)
        .zip(keys.map(key => allDimensions.map(o => o[key])))
        .fromPairs()
        .value();
}

const chartConstructor = ({
    id,
    datasetName,
    antigen,
    periodItems,
    antigenCategory,
    data,
    type,
    appendCode,
    organisationUnits,
    disaggregations,
    area = false,
    rows,
    filterDataBy,
    title,
}) => {
    const { categoryDimensions, columns: allColumns } = getDimensions(
        disaggregations,
        antigen,
        antigenCategory
    );

    const periodForTitle = `${moment(periodItems[0].id).format("DD/MM/YYYY")} - ${moment(
        _.last(periodItems).id
    ).format("DD/MM/YYYY")}`;

    const chartTitle = title(periodForTitle);

    const columns = _.isEmpty(disaggregations) ? allColumns : allColumns.filter(c => c.id !== "dx");

    const filterDimensions = _.compact([
        ...filterDataBy,
        antigenCategory,
        _.isEmpty(disaggregations) ? null : "dx",
    ]);

    const series = _.isEmpty(disaggregations) ? "dx" : columns[0].id;

    let organisationUnitElements;
    const organisationUnitNames = organisationUnits.map(ou => ou.name).join("-");

    if (area) {
        const organisationUnitParents = organisationUnits.map(ou => ou.parents[ou.id].split("/"));
        organisationUnitElements = organisationUnitParents.map(pArray => ({
            id: pArray[pArray.length - 2],
        }));
    } else {
        organisationUnitElements = organisationUnits.map(ou => ({ id: ou.id }));
    }

    return {
        id,
        name: buildDashboardItemsCode(datasetName, organisationUnitNames, antigen.name, appendCode),
        showData: true,
        publicAccess: "rw------",
        userOrganisationUnitChildren: false,
        type,
        subscribed: false,
        parentGraphMap: {},
        userOrganisationUnit: false,
        regressionType: "NONE",
        completedOnly: false,
        cumulativeValues: false,
        sortOrder: 0,
        favorite: false,
        topLimit: 0,
        title: chartTitle,
        hideEmptyRowItems: "AFTER_LAST",
        aggregationType: "DEFAULT",
        userOrganisationUnitGrandChildren: false,
        displayName: buildDashboardItemsCode(
            datasetName,
            organisationUnitNames,
            antigen.name,
            appendCode
        ),
        hideSubtitle: true,
        hideLegend: false,
        externalAccess: false,
        percentStackedValues: false,
        noSpaceBetweenColumns: false,
        hideTitle: false,
        series,
        category: rows[0],
        access: {
            read: true,
            update: true,
            externalize: true,
            delete: true,
            write: true,
            manage: true,
        },
        relativePeriods: {
            thisYear: false,
            quartersLastYear: false,
            last52Weeks: false,
            thisWeek: false,
            lastMonth: false,
            last14Days: false,
            biMonthsThisYear: false,
            monthsThisYear: false,
            last2SixMonths: false,
            yesterday: false,
            thisQuarter: false,
            last12Months: false,
            last5FinancialYears: false,
            thisSixMonth: false,
            lastQuarter: false,
            thisFinancialYear: false,
            last4Weeks: false,
            last3Months: false,
            thisDay: false,
            thisMonth: false,
            last5Years: false,
            last6BiMonths: false,
            last4BiWeeks: false,
            lastFinancialYear: false,
            lastBiWeek: false,
            weeksThisYear: false,
            last6Months: false,
            last3Days: false,
            quartersThisYear: false,
            monthsLastYear: false,
            lastWeek: false,
            last7Days: false,
            thisBimonth: false,
            lastBimonth: false,
            lastSixMonth: false,
            thisBiWeek: false,
            lastYear: false,
            last12Weeks: false,
            last4Quarters: false,
        },
        dataElementGroupSetDimensions: [],
        attributeDimensions: [],
        translations: [],
        filterDimensions,
        interpretations: [],
        itemOrganisationUnitGroups: [],
        userGroupAccesses: [],
        programIndicatorDimensions: [],
        subscribers: [],
        attributeValues: [],
        userAccesses: [],
        favorites: [],
        dataDimensionItems: data,
        categoryOptionGroupSetDimensions: [],
        columns,
        organisationUnitGroupSetDimensions: [],
        organisationUnitLevels: [],
        dataElementDimensions: [],
        periods: periodItems,
        organisationUnits: organisationUnitElements,
        categoryDimensions,
        filters: filterDimensions.map(fd => ({ id: fd })),
        rows: rows.map(r => ({ id: r })),
    };
};

const tableConstructor = ({
    id,
    datasetName,
    antigen,
    periodItems,
    antigenCategory,
    data,
    appendCode,
    organisationUnits,
    disaggregations,
    rows,
    filterDataBy,
    area,
    title,
    legendId,
    teamRowRawDimension = null,
    showRowSubTotals = true,
}) => {
    const { columns, columnDimensions, categoryDimensions } = getDimensions(
        disaggregations,
        antigen,
        antigenCategory
    );

    const categoryDimensionsWithRows = teamRowRawDimension
        ? [
              ...categoryDimensions,
              {
                  category: { id: teamRowRawDimension.categoryId },
                  categoryOptions: teamRowRawDimension.elements.map(co => ({ id: co })),
              },
          ]
        : categoryDimensions;

    let organisationUnitElements;
    const organisationUnitNames = organisationUnits.map(ou => ou.name).join("-");

    // Converts selected OrganisationUnits into their parents (Sites => Areas)
    if (area) {
        const organisationUnitParents = organisationUnits.map(ou => ou.parents[ou.id].split("/"));
        organisationUnitElements = organisationUnitParents.map(pArray => ({
            id: pArray[pArray.length - 2],
        }));
    } else {
        organisationUnitElements = organisationUnits.map(ou => ({ id: ou.id }));
    }

    const subName = antigen ? antigen.name : "Global";

    return {
        id,
        name: buildDashboardItemsCode(datasetName, organisationUnitNames, subName, appendCode),
        numberType: "VALUE",
        publicAccess: "rw------",
        userOrganisationUnitChildren: false,
        legendDisplayStyle: "FILL",
        hideEmptyColumns: false,
        subscribed: false,
        hideEmptyRows: true,
        parentGraphMap: {},
        userOrganisationUnit: false,
        rowSubTotals: showRowSubTotals && !_.isEmpty(disaggregations),
        displayDensity: "NORMAL",
        completedOnly: false,
        colTotals: true,
        showDimensionLabels: true,
        sortOrder: 0,
        fontSize: "NORMAL",
        favorite: false,
        topLimit: 0,
        aggregationType: "DEFAULT",
        userOrganisationUnitGrandChildren: false,
        displayName: buildDashboardItemsCode(
            datasetName,
            organisationUnitNames,
            subName,
            appendCode
        ),
        hideSubtitle: true,
        title,
        externalAccess: false,
        legendDisplayStrategy: "FIXED",
        colSubTotals: false,
        legendSet: legendId ? { id: legendId } : null,
        showHierarchy: false,
        rowTotals: false,
        cumulative: false,
        digitGroupSeparator: "NONE",
        hideTitle: false,
        regression: false,
        skipRounding: false,
        reportParams: {
            paramGrandParentOrganisationUnit: false,
            paramReportingPeriod: false,
            paramOrganisationUnit: false,
            paramParentOrganisationUnit: false,
        },
        access: {
            read: true,
            update: true,
            externalize: true,
            delete: true,
            write: true,
            manage: true,
        },
        relativePeriods: {
            thisYear: false,
            quartersLastYear: false,
            last52Weeks: false,
            thisWeek: false,
            lastMonth: false,
            last14Days: false,
            biMonthsThisYear: false,
            monthsThisYear: false,
            last2SixMonths: false,
            yesterday: false,
            thisQuarter: false,
            last12Months: false,
            last5FinancialYears: false,
            thisSixMonth: false,
            lastQuarter: false,
            thisFinancialYear: false,
            last4Weeks: false,
            last3Months: false,
            thisDay: false,
            thisMonth: false,
            last5Years: false,
            last6BiMonths: false,
            last4BiWeeks: false,
            lastFinancialYear: false,
            lastBiWeek: false,
            weeksThisYear: false,
            last6Months: false,
            last3Days: false,
            quartersThisYear: false,
            monthsLastYear: false,
            lastWeek: false,
            last7Days: false,
            thisBimonth: false,
            lastBimonth: false,
            lastSixMonth: false,
            thisBiWeek: false,
            lastYear: false,
            last12Weeks: false,
            last4Quarters: false,
        },
        dataElementGroupSetDimensions: [],
        attributeDimensions: [],
        translations: [],
        filterDimensions: _.compact([...filterDataBy, antigen ? antigenCategory : null]),
        interpretations: [],
        itemOrganisationUnitGroups: [],
        userGroupAccesses: [],
        programIndicatorDimensions: [],
        subscribers: [],
        attributeValues: [],
        columnDimensions,
        userAccesses: [],
        favorites: [],
        dataDimensionItems: data,
        categoryOptionGroupSetDimensions: [],
        columns,
        organisationUnitGroupSetDimensions: [],
        organisationUnitLevels: [],
        dataElementDimensions: [],
        periods: periodItems,
        organisationUnits: organisationUnitElements,
        categoryDimensions: categoryDimensionsWithRows,
        filters: filterDataBy.map(f => ({ id: f })),
        rows: rows.map(r => ({ id: r })),
        rowDimensions: rows,
    };
};
