# Introduction

This test suite has been implemented with [TestNG](https://testng.org/). Tests to be run and their order are defined in file `suites/e2e-tests.xml`.

# Notes

In any test, all created issues have titles with a suffix indicating the test number and the execution time, so that test is self-contained and does not depend on pre-existing issues.

In any test, when an issue is said to be checked what it means is that if issue has child issues:
- there is a "contains" line with aggregates of child issues estimates, remainders, opened ones and closed ones
- for each child issue there is a line with a link to, the estimate, the remainder, the label and the title of that child issue

and if issue has parent issues:
- for each parent issue there is a "partof" line with a link to, the label and the title of that parent issue

# Test Suite

## Test 000 - Login

Just login.

- Go to GitHub login page
- Log in

## Test 001 - CreateIssuesOne

Fisrt create parent issues and then create child issues with parents.

- Go to first repository
- Create `Parent One` issue
- Create `Parent Two` issue
- Create `Child One` issue, with parent `Parent One`
- Create `Child Two` issue, with parents `Parent One` and `Parent Two`
- Check `Parent One` issue
- Check `Parent Two` issue
- Check `Child One` issue
- Check `Child Two` issue

## Test 002 - CreateIssuesTwo

Fist create child issues and then second parent issues with children.

- Go to first repository
- Create `Child One` issue
- Create `Child Two` issue
- Create `Parent One` issue, with children `Child One` and `Child Two`
- Create `Parent Two` issue, with child `Child One`
- Check `Parent One` issue
- Check `Parent Two` issue
- Check `Child One` issue
- Check `Child Two` issue

## Test 003 - CreateIssuesThree

Fist create child and parent issues in both repositories and then update them to add parents/children.

- Go to first repository
- Create `Parent One` issue
- Create `Child One` issue
- Go to second repository
- Create `Parent Two` issue
- Create `Child Two` issue
- Go to first repository
- Update `Parent One` issue to add children `Child One` and `Child Two`
- Go to second repository
- Update `Child Two` issue to add parent `Parent Two`
- Go to first repository
- Check `Parent One` issue
- Check `Parent Two` issue
- Go to second repository
- Check `Child One` issue
- Check `Child Two` issue

## Test 004 - UpdateIssuesOne

First create child and parent issues and then change children, parents, labels and titles. Also close and reopen child issues.

- Go to first repository
- Create `Parent One` issue
- Create `Parent Two` issue
- Create `Child One` issue, with parent `Parent One`
- Create `Child Two` issue, with parent `Parent Two` and label `T1 - Defect`
- Update `Child One` issue to add parent `Parent Two`
- Check `Parent Two` issue
- Check `Child One` issue
- Update `Child One` issue to remove parent `Parent One`
- Check `Parent One` issue
- Check `Child One` issue
- Update `Parent One` issue to add child `Child One`
- Check `Parent One` issue
- Check `Child One` issue
- Update `Parent One` issue to replace child `Child One` with child `Child Two`
- Check `Parent One` issue
- Check `Child One` issue
- Check `Child Two` issue
- Close `Child Two` issue
- Check `Parent Two` issue
- Check `Child Two` issue
- Reopen `Child Two` issue
- Check `Parent Two` issue
- Check `Child Two` issue
- Update `Child Two` issue to change label to `T2 - Enhancement`
- Check `Parent Two` issue
- Update `Parent Two` issue to add label `T6 - Epic`
- Check `Child One` issue
- Check `Child Two` issue
- Update `Child Two` issue to change title to `Child Two Updated`
- Check `Parent Two` issue
- Update `Parent Two` issue to change title to `Parent Two Updated`
- Check `Child One` issue
- Check `Child Two Updated` issue

## Test 005 - UpdateIssuesTwo

First create child and parent issues and then change estimates and remainders.

- Go to first repository
- Create `Parent` issue
- Create `Child One` issue, with parent `Parent`, estimated 2 and remaining 2
- Create `Child Two` issue, with parent `Parent`, estimated 1 and remaining 1
- Check `Parent` issue
- Update `Child One` issue to set remaining to 1
- Check `Parent` issue
- Update `Child Two` issue to set remaining to 0
- Check `Parent` issue
- Close `Child Two` issue
- Check `Parent` issue

## Test 006 - ErrorIssues

First create child issues and then create child and parents issues including duplicates and non-existing issues.

- Go to first repository
- Create `Child One` issue
- Create `Child Two` issue
- Create `Parent One` issue with children `Child One` and `Child Two`, adding text between children list lines
- Check `Parent One` issue
- Create `Parent Two` issue with children `Child One` and `Child Two`, adding a brank line between children list lines
- Check `Parent Two` issue
- Create `Parent Three` issue with non-existent child
- Check `Parent Three` issue
- Create `Child Three` issue with non-existent parent
- Check `Child Three` issue
- Create `Parent Four` issue with duplicated child `Child One`
- Check `Parent Four` issue
- Create `Child Four` issue with duplicated parent `Parent One`
- Check `Child Four` issue

## Test 007 - SearchIssues

First create child issues with a milestone and then create a parent issue searching that milestone.

- Go to second repository
- Create `Child One` issue with milestone 'Yoda 1.0.0', estimated 2 and remaining 2
- Create `Child Two` issue with milestone 'Yoda 1.0.0', estimated 1 and remaining 1
- Create `Parent One` issue with search by repository, milestone and title
- Check `Child One` issue
- Check `Child Two` issue
- Check `Parent One` issue
- Update `Child One` issue to set remaining to 1
- Update `Child One` issue to set remaining to 0
- Check `Parent One` issue
- Close `Child Two` issue
- Check `Parent One` issue
