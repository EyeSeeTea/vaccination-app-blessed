import React from "react";
import PropTypes from "prop-types";
import { OrgUnitsSelector } from "d2-ui-components";
import _ from "lodash";
import "./OrganisationUnitsStep.css";

/*
    HACK: Use css to hide all selector boxes in tree except for those of level 6.
    This way, we don't have to fork @dhis2/d2-ui:OrgUnitTree. This component has
    a prop hideCheckboxes, but it's an all or nothing bool (ideally, it should get a predicate).
*/

class OrganisationUnitsStep extends React.Component {
    static propTypes = {
        d2: PropTypes.object.isRequired,
        campaign: PropTypes.object.isRequired,
        onChange: PropTypes.func.isRequired,
    };

    controls = {
        filterByLevel: false,
        filterByGroup: false,
        selectAll: false,
    };

    setOrgUnits = orgUnitsPaths => {
        const orgUnits = orgUnitsPaths.map(path => ({
            id: _.last(path.split("/")),
            level: path.split("/").length - 1,
            path,
        }));
        const orgUnitsForAcceptedLevels = orgUnits.filter(ou =>
            this.props.campaign.selectableLevels.includes(ou.level)
        );
        const newCampaign = this.props.campaign.setOrganisationUnits(orgUnitsForAcceptedLevels);
        this.props.onChange(newCampaign);
    };

    render() {
        const { d2, campaign } = this.props;

        return (
            <OrgUnitsSelector
                d2={d2}
                onChange={this.setOrgUnits}
                selected={campaign.organisationUnits.map(ou => ou.path)}
                levels={campaign.selectableLevels}
                controls={this.controls}
            />
        );
    }
}

export default OrganisationUnitsStep;
