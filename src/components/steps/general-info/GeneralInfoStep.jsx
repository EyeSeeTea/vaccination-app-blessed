import React from "react";
import PropTypes from "prop-types";
import i18n from "@dhis2/d2-i18n";
import _ from "lodash";

import { withStyles } from "@material-ui/core/styles";
import { Card, CardContent } from "@material-ui/core";

import { TextField } from "@dhis2/d2-ui-core";
import { FormBuilder } from "@dhis2/d2-ui-forms";
import { Validators } from "@dhis2/d2-ui-forms";

import { DatePicker } from "@eyeseetea/d2-ui-components";
import { translateError } from "../../../utils/validations";

class GeneralInfoStep extends React.Component {
    state = {
        orgUnitNames: null,
    };

    static propTypes = {
        d2: PropTypes.object.isRequired,
        campaign: PropTypes.object.isRequired,
        onChange: PropTypes.func.isRequired,
    };

    validateCampaignName = async name => {
        const { campaign } = this.props;
        const errors = await campaign.validateName(name);

        if (!_.isEmpty(errors)) {
            throw errors.map(translateError).join(", ");
        }
    };

    onUpdateField = (fieldName, newValue) => {
        const { campaign, onChange } = this.props;
        let newCampaign;

        switch (fieldName) {
            case "name":
                newCampaign = campaign.setName(newValue);
                break;
            case "description":
                newCampaign = campaign.setDescription(newValue);
                break;
            case "startDate":
                newCampaign = campaign.setStartDate(newValue);
                break;
            case "endDate":
                newCampaign = campaign.setEndDate(newValue);
                break;
            default:
                console.error(`Field not implemented: ${fieldName}`);
                newCampaign = null;
        }
        if (newCampaign) onChange(newCampaign);
    };

    render() {
        const { campaign } = this.props;
        const fields = [
            {
                name: "name",
                value: campaign.name,
                component: TextField,
                props: {
                    floatingLabelText: i18n.t("Name"),
                    style: { width: "33%" },
                    changeEvent: "onBlur",
                    "data-field": "name",
                },
                validators: [
                    {
                        message: i18n.t("Field cannot be blank"),
                        validator: Validators.isRequired,
                    },
                ],
                asyncValidators: [this.validateCampaignName],
            },
            {
                name: "description",
                value: campaign.description,
                component: TextField,
                props: {
                    floatingLabelText: i18n.t("Description"),
                    style: { width: "33%" },
                    changeEvent: "onBlur",
                    "data-field": "description",
                    multiLine: true,
                },
            },
            {
                name: "startDate",
                value: campaign.startDate,
                component: DatePicker,
                props: {
                    label: i18n.t("Start Date"),
                    value: campaign.startDate,
                    onChange: value => this.onUpdateField("startDate", value),
                },
            },
            {
                name: "endDate",
                value: campaign.endDate,
                component: DatePicker,
                props: {
                    label: i18n.t("End Date"),
                    value: campaign.endDate,
                    onChange: value => this.onUpdateField("endDate", value),
                },
            },
        ];

        return (
            <Card>
                <CardContent>
                    <FormBuilder fields={fields} onUpdateField={this.onUpdateField} />
                </CardContent>
            </Card>
        );
    }
}

const styles = _theme => ({});

export default withStyles(styles)(GeneralInfoStep);
