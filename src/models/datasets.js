import _ from "lodash";

const fields = [
    "id",
    "name",
    "code",
    "displayName",
    "displayDescription",
    "shortName",
    "created",
    "lastUpdated",
    "externalAccess",
    "publicAccess",
    "userAccesses",
    "userGroupAccesses",
    "user",
    "access",
    "attributeValues[value, attribute[code]]",
    "href",
];

function cleanOptions(options) {
    return _.omitBy(options, value => _.isArray(value) && _.isEmpty(value));
}

export async function list(config, d2, filters, pagination) {
    const { search, showOnlyUserCampaigns } = filters || {};
    const { page, pageSize = 20, sorting } = pagination || {};
    // order=FIELD:DIRECTION where direction = "iasc" | "idesc" (insensitive ASC, DESC)
    const [field, direction] = sorting || [];
    const order = field && direction ? `${field}:i${direction}` : undefined;
    const vaccinationIds = await getByAttribute(config, d2);
    const filter = _.compact([
        search ? `displayName:ilike:${search}` : null,
        showOnlyUserCampaigns ? `user.id:eq:${d2.currentUser.id}` : null,
        `id:in:[${vaccinationIds.join(",")}]`,
    ]);
    const listOptions = { fields, filter, page, pageSize, order };
    const collection = await d2.models.dataSets.list(cleanOptions(listOptions));
    return { pager: collection.pager, objects: collection.toArray() };
}

async function getByAttribute(config, d2) {
    const appCode = config.attibuteCodeForApp;
    const filter = `attributeValues.attribute.code:eq:${appCode}`;
    const listOptions = {
        filter,
        fields: ["id", "attributeValues[value, attribute[code]]"],
        paging: false,
    };
    const dataSets = await d2.models.dataSets.list(listOptions);
    const ids = dataSets
        .toArray()
        .filter(
            ({ attributeValues }) =>
                !!attributeValues.some(
                    ({ attribute, value }) => attribute.code === appCode && value === "true"
                )
        )
        .map(el => el.id);
    return ids;
}

export function getDashboardId(dataSet, config) {
    return _(dataSet.attributeValues || [])
        .filter(av => av.attribute.code === config.attributeCodeForDashboard)
        .map(av => av.value)
        .first();
}
