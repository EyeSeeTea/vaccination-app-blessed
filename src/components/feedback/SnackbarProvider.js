import React, { Component } from "react";
import snackbarContext from "./context";
import SnackbarConsumer from "./SnackbarConsumer";

export default class SnackbarProvider extends Component {
    constructor(props) {
        super(props);

        this.state = {
            isOpen: false,
            message: "",
            variant: "success",
        };
    }

    // level : "success" | "info" | "warning" | "error"
    openSnackbar = (level, message, { autoHideDuration = 2000 } = {}) => {
        this.setState({
            message,
            isOpen: true,
            variant: level,
            autoHideDuration,
        });
    };

    closeSnackbar = () => {
        this.setState({
            message: "",
            isOpen: false,
        });
    };

    render() {
        const { children } = this.props;

        const value = {
            openSnackbar: this.openSnackbar,
            closeSnackbar: this.closeSnackbar,
            snackbarIsOpen: this.state.isOpen,
            message: this.state.message,
            variant: this.state.variant,
            autoHideDuration: this.state.autoHideDuration,
        };

        return (
            <snackbarContext.Provider value={value}>
                <SnackbarConsumer />
                {children}
            </snackbarContext.Provider>
        );
    }
}
