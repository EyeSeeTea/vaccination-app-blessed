import moment from "moment";

describe("Campaign configuration - Create", () => {
    before(() => {
        cy.login("admin");
        cy.loadPage();
        cy.contains("Campaign Configuration").click();
        cy.get("[data-test=list-action-bar]").click();
    });

    beforeEach(() => {});

    it("gets data from the user", () => {
        cy.contains("New vaccination campaign");

        // Organisation Units Step
        cy.contains("Select the organization units which will implement the campaign");

        cy.contains("Next").click();
        cy.contains("Select at least one organisation unit");

        expandOrgUnit("OCBA");
        expandOrgUnit("ANGOLA");
        expandOrgUnit("HUAMBO");
        expandOrgUnit("Hospital central de Huambo");

        selectOrgUnit("Emergency Room");
        selectOrgUnit("Paediatric Ward");

        cy.contains("Next").click();

        // General Info step

        cy.contains("Next").click();
        cy.contains("Field name cannot be blank");

        cy.get("[data-field='name']").type("Test vaccination campaign");
        cy.contains("Start date").click({ force: true });
        clickDay(11);

        cy.contains("End Date").click({ force: true });
        clickDay(25);

        cy.contains("Next").click();

        // Antigens selections

        cy.contains("Next").click();
        cy.contains("Select at least one antigen");

        selectAntigen("Measles");
        selectAntigen("Cholera");

        cy.contains("Next").click();

        // Disaggregation

        cy.contains("Measles");
        cy.contains("Cholera");

        cy.contains("Next").click();

        // Save step

        cy.get("[data-test-current=true]").contains("Save");

        cy.contains("Name");
        cy.contains("Test vaccination campaign");

        cy.contains("Period dates");
        const now = moment();
        const expectedDataStart = now.set("date", 11).format("LL");
        const expectedDataEnd = now.set("date", 25).format("LL");
        cy.contains(`${expectedDataStart} -> ${expectedDataEnd}`);

        cy.contains("Antigens");
        cy.contains("Measles");
        cy.contains("Cholera");

        cy.contains("Organisation Units");
        cy.contains(
            "[2] " +
                [
                    "MSF-OCBA-ANGOLA-HUAMBO, Malaria outbreak-Hospital central de Huambo-Emergency Room",
                    "MSF-OCBA-ANGOLA-HUAMBO, Malaria outbreak-Hospital central de Huambo-Paediatric Ward",
                ].join(", ")
        );

        cy.get("[data-wizard-contents] button")
            .contains("Save")
            .click();

        cy.contains("Campaign created: Test vaccination campaign");
    });
});

function expandOrgUnit(label) {
    cy.server()
        .route("GET", "/api/organisationUnits/*")
        .as("getChildrenOrgUnits");
    cy.get("[data-wizard-contents]")
        .contains(label)
        .parents(".label")
        .prev()
        .click();
    cy.wait("@getChildrenOrgUnits");
}

function selectOrgUnit(label) {
    cy.contains(label)
        .prev()
        .click();
}

function clickDay(dayOfMonth) {
    cy.xpath(`//span[contains(text(), '${dayOfMonth}')]`).then(spans => {
        const span = spans[spans.length - 1];
        if (span && span.parentElement) {
            span.parentElement.click();
        }
    });

    /* eslint-disable cypress/no-unnecessary-waiting */
    cy.wait(100);
}

function selectAntigen(label) {
    cy.get("[data-multi-selector] > div > div > div select:first").select(label);
    cy.get("[data-multi-selector] > div > div > div:nth-child(2)")
        .contains("→")
        .click();
}
