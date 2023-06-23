# Yoda REST API

Yoda REST API allows to setup a highly customisable API for exposing GitHub issues within a configurable product- and component structure.

For each issue a set of mapping rules can be applied in order to extract and/or map values from the issue into customisable return fields. 

See `config.yml` and the associated `yoda-restapi-swagger.yaml` files for more details.

## config.yml

This file has four sections describing the configuration required. First is the definition of products. Each product will have a name (`product_name`) and can have as well a `product_family` value. Then each product can have a number of components which, in turn, will refer to a set of GitHub repositories. Repositories can be identified either explicitly by their `owner/repo` value, or alternatively using repository topics. In this case, you can specifify multiple repository topics (AND) and as well prepend with `-` to achieve a negatated search (AND NOT).

### Product section

Example:
```
products:
  windows10:
    product_name: Windows 10
    product_family: Windows
    components:
      io:
        component_name: Windows 10 IO
        repositories:
        - microsoft/@win10-io,-internal    # all repositories under microsoft with topic "win10-io", but NOT the topic "internal"
      ui:
        component_name: Windows 10 UI
        repositories:
        - microsoft/ui-facade
        - microsoft/ui-api
    product_name: Windows 11
    product_family: Windows
      ...    # and so on.
  word365:
    product_name: Office Word 365
    product_family: Office 365
    components:
      hyphernation:
        component_name: Word hyphenation
        repositories:
        - microsoft/word-hyphenation-base
        - microsoft/@hyphenation-language-pack
      ...    # and so on.
```

### Queries section

It is possible to consider predefined queries in the form `arg=value` where `arg` can be seen from the swagger file.

Example:

```
queries:
  open-demo-bug: 
    parameters: state=open&labels=T1 - Defect&product=yoda-demo
    description: Retrieve all open Yoda Demo bugs
  lego-bug:
    parameters: state=all&product=yoda-demo&labels=C - Lego
    description: Retrieve all open Yoda Demo bugs
```

### Token section

Access to Yoda REST API is done via preshared tokens defined directly in the configuration file. Without a valid token, you can only retrieve the swagger specification itself. The "user" associated with the token will be logged in the log file to allow auditing requests.

### extra_fields section

The `extra_fields` section is a very powerful mechanism to introduce extra fields based on values from the issues. It is also possible to promote values which are otherwise burried within JSON constructions (see e.g. `user` in the example below). 

Three rules are supported:

`extract_label`: Retrieves label(s) matching a regular expression and extracts the value from the first expression (i.e. the value inside the first set of parentesis in the regular expression). If a separator is given, then all labels matching will be returned, separated by the separator. If separator is blank only one of the matching labels will be returned.

`binary_label`: Assume one of two values, as specified by `value_match` or `value_nomatch`, depending of whether - one or more - labels exist matching a supplied regular expression.

`extract_issue`: Extract a value from the JSON returned for an issue. If a pattern is given, then return the value of the first expression (again, the value inside the parentesis).

Example:
```
extra_fields:
  # Customer should concatenate (with comma) any values
  company:
    rule: extract_label
    pattern: '^C - (.*)'
    separator: ","
  severity:
    rule: extract_label
    pattern: '^S[1-4] - (.*)$'
    # none_value can be specified, but null is actually also the default
    none_value: null
    # If separator is empty then take only first
    separator: ""
    mapping: 'map["Urgent"]="Critical"; map["High"]="Serious";'
  type:
    rule: extract_label
    pattern: '^T[1-9][0-9]? - (.*)$'
    separator: ""
  support:
    rule: binary_label
    pattern: '^Support$'
    value_match: true
    value_nomatch: false
  origin:
    rule: binary_label
    pattern: '^C - .*$'
    value_match: "External"
    value_nomatch: "Internal"
  support_id:
    rule: extract_issue
    field: "title"
    pattern: '^.*[\[](SUP-[0-9]+)[\]]$'
  milestone:
    rule: extract_issue
    field: "milestone.title"
  user:
    rule: extract_issue
    field: "user.login"
  assignee:
    rule: extract_issue
    field: "assignee.login"
```
