# newman-reporter-junit5

Newman reporter for the [JUnit 5 schema specification](https://github.com/junit-team/junit5/blob/main/platform-tests/src/test/resources/jenkins-junit.xsd).

Includes skipped tests as well in the report.

## Installation

```sh
npm i -g newman-reporter-junit5
```

## Usage

```sh
newman run <collection-path> -r junit5 [--reporter-junit5-export <export-path>]
```
