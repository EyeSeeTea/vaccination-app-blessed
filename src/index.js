import React from "react";
import ReactDOM from "react-dom";
import { init, config, getUserSettings, getManifest } from "d2";
import "font-awesome/css/font-awesome.min.css";
import { HashRouter } from "react-router-dom";
import i18n from "@dhis2/d2-i18n";
import moment from "moment";
import _ from "lodash";
import App from "./components/app/App";

import "./locales";

config.schemas = ["dataSet", "organisationUnit"];

function isLangRTL(code) {
    const langs = ["ar", "fa", "ur"];
    const prefixed = langs.map(c => `${c}-`);
    return langs.includes(code) || prefixed.filter(c => code && code.startsWith(c)).length > 0;
}

function configI18n(userSettings) {
    const uiLocale = userSettings.keyUiLocale;

    if (uiLocale && uiLocale !== "en") {
        config.i18n.sources.add(`./i18n/i18n_module_${uiLocale}.properties`);
    }

    config.i18n.sources.add("./i18n/i18n_module_en.properties");
    document.documentElement.setAttribute("dir", isLangRTL(uiLocale) ? "rtl" : "ltr");

    i18n.changeLanguage(uiLocale);
    moment.locale(uiLocale);
}

async function getBaseUrl() {
    if (process.env.NODE_ENV === "development") {
        const port = process.env.REACT_APP_PORT || "8081";
        const baseUrl = `http://localhost:${port}/dhis2`;
        console.info(`[DEV] DHIS2 instance: ${baseUrl}`);
        return baseUrl;
    } else {
        const manifest = await getManifest("./manifest.webapp");
        return manifest.getBaseUrl();
    }
}

function loadHeaderBarTranslations(d2) {
    const keys = _([
        "app_search_placeholder",
        "manage_my_apps",
        "no_results_found",
        "settings",
        "profile",
        "account",
        "help",
        "log_out",
        "about_dhis2",
    ]);
    keys.each(s => d2.i18n.strings.add(s));
    d2.i18n.load();
}

async function main() {
    const baseUrl = await getBaseUrl();
    const apiUrl = baseUrl.replace(/\/*$/, "") + "/api";
    try {
        const d2 = await init({ baseUrl: apiUrl });
        window.d2 = d2; // Make d2 available in the console
        loadHeaderBarTranslations(d2);
        const userSettings = await getUserSettings();
        configI18n(userSettings);
        const appConfig = await fetch("app-config.json", {
            credentials: "same-origin",
        }).then(res => res.json());
        ReactDOM.render(
            <HashRouter>
                <App d2={d2} appConfig={appConfig} />
            </HashRouter>,
            document.getElementById("root")
        );
    } catch (err) {
        console.error(err);
        const message = err.toString().match("Unable to get schemas") ? (
            <div>
                <a rel="noopener noreferrer" target="_blank" href={baseUrl}>
                    Login
                </a>{" "}
                {baseUrl}
            </div>
        ) : (
            err.toString()
        );
        ReactDOM.render(<div>{message}</div>, document.getElementById("root"));
    }
}

main();
