## Setup

```
$ yarn install
```

When using code of a not yet published d2-ui-components, you will need to link to a development branch of `d2-ui-components`. For that, run `yarn link` in d2-ui-components and `yarn link d2-ui-components` in this project.

## Development

Start development server:

```
$ yarn start
```

This will open the development server at port 8081 and will connect to DHIS 2 instance http://localhost:8080.

Use custom values passing environment variables:

```
$ PORT=8082 REACT_APP_DHIS2_URL="https://play.dhis2.org/dev" yarn start
```

## Tests

Run unit tests:

```
$ yarn test
```

Run integration tests locally:

```
$ export CYPRESS_DHIS2_AUTH='admin:district'
$ export CYPRESS_EXTERNAL_API="http://localhost:8080"
$ export CYPRESS_ROOT_URL=http://localhost:8081

$ yarn cy:e2e:run # non-interactive
$ yarn cy:e2e:open # interactive UI
```

For this to work in Travis CI, you will have to create an environment variable CYPRESS_DHIS2_AUTH ([settings](https://travis-ci.org/tokland/vaccination-app/settings) -> Environment Variables) with the password used in your
testing DHIS2 instance.

## Build

```
$ yarn build-webapp
```

## i18n

### Update an existing language

```
$ yarn update-po
# ... add/edit translations in po files ...
$ yarn localize
```

### Create a new language

```
$ cp i18n/en.pot i18n/es.po
# ... add translations to i18n/es.po ...
$ yarn localize
```
