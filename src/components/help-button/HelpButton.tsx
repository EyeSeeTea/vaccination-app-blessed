import React from "react";
import { Icon, IconButton, Tooltip } from "@material-ui/core";
import { DialogButton } from "@eyeseetea/d2-ui-components";
import "./HelpButton.css";

import i18n from "../../locales";
import { Maybe } from "../../models/db.types";

export interface HelpProps {
    title: string;
    contents: string;
    pageVisited: Maybe<boolean>;
}

function Button({ onClick }: { onClick: () => void }) {
    return (
        <Tooltip title={i18n.t("Help")}>
            <IconButton onClick={onClick}>
                <Icon color="primary">help</Icon>
            </IconButton>
        </Tooltip>
    );
}

class HelpButton extends React.Component<HelpProps> {
    public render() {
        const { title, contents, pageVisited } = this.props;

        return (
            <DialogButton
                buttonComponent={Button}
                title={title}
                contents={contents}
                initialIsOpen={pageVisited === undefined ? undefined : !pageVisited}
            />
        );
    }
}

export default HelpButton;
