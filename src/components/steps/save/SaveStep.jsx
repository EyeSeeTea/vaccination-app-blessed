import React from "react";
import PropTypes from "prop-types";
import i18n from "@dhis2/d2-i18n";
import _ from "lodash";
import moment from "moment";
import { withRouter } from "react-router-dom";
import { withStyles } from "@material-ui/core/styles";
import { Button, LinearProgress } from "@material-ui/core";
import { withSnackbar } from "d2-ui-components";

import { getFullOrgUnitName } from "../../../models/organisation-units";
import ExitWizardButton from "../../wizard/ExitWizardButton";

const styles = _theme => ({
    wrapper: {
        padding: 5,
    },
    saveButton: {
        margin: 10,
        backgroundColor: "#2b98f0",
        color: "white",
    },
});

class SaveStep extends React.Component {
    state = {
        isSaving: false,
        orgUnits: null,
        errorMessage: [],
        dialogOpen: false,
    };

    static propTypes = {
        d2: PropTypes.object.isRequired,
        campaign: PropTypes.object.isRequired,
        snackbar: PropTypes.object.isRequired,
        classes: PropTypes.object.isRequired,
    };

    async componentDidMount() {
        const { campaign } = this.props;
        const { objects: orgUnits } = await campaign.getOrganisationUnitsWithName();
        this.setState({ orgUnits });
    }

    save = async () => {
        const { campaign } = this.props;
        const { isSaving } = this.state;
        if (isSaving) return;

        this.setState({ isSaving: true, errorMessage: "" });

        try {
            const saveResponse = await campaign.save();
            this.setState({ isSaving: false });

            if (saveResponse.status) {
                this.props.snackbar.success(`${i18n.t("Campaign created")} ${campaign.name}`);
                this.props.history.push("/campaign-configuration");
            } else {
                this.setState({ errorMessage: saveResponse.error });
                this.props.snackbar.error(i18n.t("Error saving campaign"));
            }
        } catch (err) {
            console.error(err);
            this.props.snackbar.error(err.message || err.toString());
            this.setState({ isSaving: false });
        }
    };

    cancel = () => {
        this.setState({ dialogOpen: true });
    };

    confirmCancel = () => {
        this.setState({ dialogOpen: false });
        this.props.history.push("/campaign-configuration");
    };

    dialogCancel = () => {
        this.setState({ dialogOpen: false });
    };

    getMessageFromPaginated(paginatedObjects) {
        if (!paginatedObjects) {
            return i18n.t("Loading...");
        } else {
            const { pager, objects } = paginatedObjects;
            const othersCount = pager.total - objects.length;
            const names =
                _(objects)
                    .sortBy()
                    .join(", ") || i18n.t("[None]");
            if (othersCount > 0) {
                return i18n.t("[{{total}}] {{names}} and {{othersCount}} other(s)", {
                    total: pager.total,
                    names,
                    othersCount,
                });
            } else {
                return `[${pager.total}] ${names}`;
            }
        }
    }

    renderLiEntry = ({ label, value, children }) => {
        return (
            <li key={label}>
                {label}
                {value || children ? ": " : ""}
                {value}
                {children}
            </li>
        );
    };

    getCampaignPeriodDateString = () => {
        const { campaign } = this.props;
        const { startDate, endDate } = campaign;

        if (startDate && endDate) {
            return [
                moment(campaign.startDate).format("LL"),
                "->",
                moment(campaign.endDate).format("LL"),
            ].join(" ");
        } else {
            return "-";
        }
    };

    renderDataElements(dataElements) {
        const LiEntry = this.renderLiEntry;

        return dataElements.map(dataElement => {
            return <LiEntry key={dataElement.code} label={dataElement.name} />;
        });
    }

    renderOrgUnit = orgUnit => {
        const LiEntry = this.renderLiEntry;

        return <LiEntry key={orgUnit.id} label={getFullOrgUnitName(orgUnit)} />;
    };

    render() {
        const { classes, campaign } = this.props;
        const { orgUnits, errorMessage, isSaving, dialogOpen } = this.state;

        const LiEntry = this.renderLiEntry;
        const disaggregation = campaign.getEnabledAntigensDisaggregation();

        return (
            <React.Fragment>
                <ExitWizardButton
                    isOpen={dialogOpen}
                    onConfirm={this.props.onCancel}
                    onCancel={this.dialogCancel}
                />
                <div className={classes.wrapper}>
                    <ul>
                        <LiEntry label={i18n.t("Name")} value={campaign.name} />

                        <LiEntry
                            label={i18n.t("Period dates")}
                            value={this.getCampaignPeriodDateString()}
                        />
                        <LiEntry label={i18n.t("Number of Teams")} value={campaign.teams} />
                        <LiEntry label={i18n.t("Organisation Units")}>
                            {orgUnits && (
                                <React.Fragment>
                                    [{orgUnits.length}]<ul>{orgUnits.map(this.renderOrgUnit)}</ul>
                                </React.Fragment>
                            )}
                        </LiEntry>

                        <LiEntry label={i18n.t("Antigens")}>
                            [{disaggregation.length}]
                            <ul>
                                {disaggregation.map(({ antigen, dataElements }) => (
                                    <LiEntry
                                        key={antigen.code}
                                        label={`${antigen.name} (${i18n.t("doses")}: ${
                                            antigen.doses.length
                                        })`}
                                    >
                                        <ul>{this.renderDataElements(dataElements)}</ul>
                                    </LiEntry>
                                ))}
                            </ul>
                        </LiEntry>
                    </ul>

                    <Button onClick={this.cancel} variant="contained">
                        {i18n.t("Cancel")}
                    </Button>
                    <Button className={classes.saveButton} onClick={this.save} variant="contained">
                        {i18n.t("Save")}
                    </Button>

                    {isSaving && <LinearProgress />}

                    <pre>{errorMessage}</pre>
                </div>
            </React.Fragment>
        );
    }
}

export default withSnackbar(withRouter(withStyles(styles)(SaveStep)));
