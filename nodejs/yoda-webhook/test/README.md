# Prerequisites

- Two GitHub users, say `user1` and `user2`, with respective passwords `pass1` and `pass2`.
- Two GitHub repositories, say `org1/repo1` and `org2/repo2`. No problem if `org1` and `arg2` are the same organization. Both users `user1` and `user2` need to have permission to work with issues in both repositories.
- Create labels `T1 - Defect`, `T2 - Enhancement`, `T3 - Task `, `T6 - Epic` on first repository
- Create milestone `Yoda 1.0.0` on second repository
- User `user2` need to generate a personal access token on GitHub, on Settings / Developer settings / Personal access token
- Run a docker Yoda webhook image as describe [here](https://github.hpe.com/hpsd/yoda/tree/master/nodejs/yoda-webhook) using as secret the token generated in previous step
- Configure both repositories webhooks, on Settings / Hooks / Add webhook, to notify issue events to Yoda webhook started in previous step

# Configuration

Following configuration properties can be customized:

- `DRIVER_TYPE`: Type of Selenium driver, one of `chrome` to execute locally on a Windows machine, or `chrome-remote` to execute remotely on a Selenium Hub. If `chrome-remote` is set `DRIVER_REMOTE_URL` must be defined. By default `chrome-remote`.
- `DRIVER_REMOTE_URL`: Entrypoint to Selenium Hub, only if `DRIVER_TYPE` is set to `chrome-remote`. No default value.
- `GITHUB_URL`: GitHub URL. No default value.
- `GITHUB_USERNAME`: GitHub first username. No default value.
- `GITHUB_PASSWORD`: GitHub first password. No default value.
- `GITHUB_REPO_ONE`: GitHub first repository. No default value.
- `GITHUB_REPO_TWO`: GitHub second repository. No default value.

These properties can be defined in file `src/main/resources/test.properties` or in command line when run, with command line taking precedence over file. By example, to run tests defining user and password in commmand line:

`mvn -DGITHUB_USERNAME=user1 -DGITHUB_PASSWORD=pass1 test`

# Logging

Logging configuration can be set in file `src/main/resources/logging.properties`. By default, trace level `All` is enabled and tracing is sent both to standard output and to a file called `com-hpe-obiwan-test.txt` on temp directory.

# Run on Windows

- Clone this repository.
- Set `DRIVER_TYPE` property to `chrome`, and `GITHUB_USERNAME`, `GITHUB_PASSWORD`, `GITHUB_REPO_ONE`, `GITHUB_REPO_TWO` to the real values used in prerequisites.
- Execute `mvn test`. This will automatically starts a Chrome navigator where test will be executed.

If there are client certificates installed locally, a pop-up will appear prompting to select a certificate to enter GitHub. Cancel button must be pressed manually in order to continue to login/password page.

# Run remotely

- Run a Selenium Hub, by example elgalu/selenium docker image.
- Clone this repository.
- Set `DRIVER_TYPE` property to `chrome-remote`,  `DRIVER_REMOTE_URL` to the Selenium Hub entry point, and `GITHUB_USERNAME`, `GITHUB_PASSWORD`, `GITHUB_REPO_ONE`, `GITHUB_REPO_TWO` to the real values used in prerequisites.
- Execute `mvn test`.

# Implemented Tests

[See](TEST_CASES.md).
