import React from "react";
import PropTypes from "prop-types";
import i18n from "@dhis2/d2-i18n";
import { withRouter } from "react-router";
import _ from "lodash";
import { withSnackbar, Wizard } from "d2-ui-components";
import { LinearProgress } from "@material-ui/core";

import Campaign from "models/campaign";
import PageHeader from "../shared/PageHeader";
import OrganisationUnitsStep from "../steps/organisation-units/OrganisationUnitsStep";
import SaveStep from "../steps/save/SaveStep";
import { getValidationMessages } from "../../utils/validations";
import GeneralInfoStep from "../steps/general-info/GeneralInfoStep";
import AntigenSelectionStep from "../steps/antigen-selection/AntigenSelectionStep";
import DisaggregationStep from "../steps/disaggregation/DisaggregationStep";
import { memoize } from "../../utils/memoize";
import ExitWizardButton from "../wizard/ExitWizardButton";

class CampaignWizard extends React.Component {
    static propTypes = {
        d2: PropTypes.object.isRequired,
        db: PropTypes.object.isRequired,
        history: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,
        snackbar: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            campaign: null,
            dialogOpen: false,
        };
    }

    async componentDidMount() {
        const { db, config, match } = this.props;

        try {
            const campaign = this.isEdit()
                ? await Campaign.get(config, db, match.params.id)
                : Campaign.create(config, db);
            this.setState({ campaign });
        } catch (err) {
            this.props.snackbar.error(i18n.t("Cannot load campaign") + `: ${err.message || err}`);
            this.props.history.push("/campaign-configuration");
        }
    }

    isEdit() {
        return !!this.props.match.params.id;
    }

    getStepsBaseInfo() {
        return [
            {
                key: "general-info",
                label: i18n.t("General info"),
                component: GeneralInfoStep,
                validationKeys: ["name", "startDate", "endDate"],
                description: i18n.t(
                    `Choose a name for the campaign and define the period for which data entry will be enabled`
                ),
                help: i18n.t(
                    `Give your campaign a name that will make it easy to recognize in an HMIS hierarchy. Suggested format is "RVC {LOCATION} - {ANTIGEN1}/{ANTIGEN2}/... - {CAMPAIGN PERIOD}". Example -> "RVC Shabunda - Measles/Cholera - Jan-Mar 2019".\n
                    The start and end date should define the period for which you expect to enter data - i.e .the first and last day of your campaign. If you are not certain of the end date, enter a date a few weeks later than the expected date of completion (refer to your microplan). It is possible to edit the dates at any point.`
                ),
            },
            {
                key: "organisation-units",
                label: i18n.t("Organisation Units"),
                component: OrganisationUnitsStep,
                validationKeys: ["organisationUnits", "teams"],
                description: i18n.t(
                    `Select the health facilities or health area where the campaign will be implemented`
                ),
                help: i18n.t(
                    `Select the health facilities or health areas which will implement the campaign. At least one must be selected. Only organisation units of level 5 (Health site) can be selected.`
                ),
            },
            {
                key: "antigen-selection",
                label: i18n.t("Antigen selection"),
                component: AntigenSelectionStep,
                validationKeys: ["antigens"],
                description: i18n.t(`Select the antigens which will be administered`),
                help: i18n.t(`Select the antigens which will be administered.`),
            },
            {
                key: "disaggregation",
                label: i18n.t("Configure Indicators"),
                component: DisaggregationStep,
                validationKeys: ["antigensDisaggregation"],
                validationKeysLive: ["antigensDisaggregation"],
                description: i18n.t(`Select indicators and categories for each antigen`),
                help: i18n.t(`Select the indicators and breakdowns that you wish to monitor for each antigen in your campaign.\n
                Standard age groups for each antigen appear by default. In some cases, you may click on an age group to select subdivisions if that information is important for your campaign. Compulsory indicators may not be un-selected.`),
            },
            {
                key: "save",
                label: i18n.t("Save"),
                component: SaveStep,
                validationKeys: [],
                description: i18n.t(
                    'Setup of your campaign is complete. Click the "Save" button to save your campaign, then you can set your target population, go to data entry and go to dashboard'
                ),
                help: i18n.t(
                    `Please review your vaccination campaign summary. Click the "Save" button to create the data set and all associated metadata for this campaign`
                ),
            },
        ];
    }

    cancelSave = () => {
        this.setState({ dialogOpen: true });
    };

    handleConfirm = () => {
        this.setState({ dialogOpen: false });
        this.props.history.push("/campaign-configuration");
    };

    handleDialogCancel = () => {
        this.setState({ dialogOpen: false });
    };

    onChange = memoize(step => async campaign => {
        const errors = await getValidationMessages(campaign, step.validationKeysLive || []);
        this.setState({ campaign });
        if (!_(errors).isEmpty()) {
            this.props.snackbar.error(errors.join("\n"));
        }
    });

    onStepChangeRequest = async currentStep => {
        return await getValidationMessages(this.state.campaign, currentStep.validationKeys);
    };

    render() {
        const { d2, location } = this.props;
        const { campaign, dialogOpen } = this.state;
        window.campaign = campaign;

        const steps = this.getStepsBaseInfo().map(step => ({
            ...step,
            props: {
                d2,
                campaign,
                onChange: this.onChange(step),
                onCancel: this.handleConfirm,
            },
        }));

        const urlHash = location.hash.slice(1);
        const stepExists = steps.find(step => step.key === urlHash);
        const firstStepKey = steps.map(step => step.key)[0];
        const initialStepKey = stepExists ? urlHash : firstStepKey;
        const lastClickableStepIndex = this.isEdit() ? steps.length - 1 : 0;
        const title = this.isEdit()
            ? i18n.t("Edit vaccination campaign")
            : i18n.t("New vaccination campaign");

        return (
            <React.Fragment>
                <ExitWizardButton
                    isOpen={dialogOpen}
                    onConfirm={this.handleConfirm}
                    onCancel={this.handleDialogCancel}
                />
                <PageHeader
                    title={`${title}: ${campaign ? campaign.name : i18n.t("Loading...")}`}
                    onBackClick={this.cancelSave}
                />
                {campaign ? (
                    <Wizard
                        steps={steps}
                        initialStepKey={initialStepKey}
                        useSnackFeedback={true}
                        onStepChangeRequest={this.onStepChangeRequest}
                        lastClickableStepIndex={lastClickableStepIndex}
                    />
                ) : (
                    <LinearProgress />
                )}
            </React.Fragment>
        );
    }
}

export default withSnackbar(withRouter(CampaignWizard));
