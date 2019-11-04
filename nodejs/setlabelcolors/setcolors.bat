set ARGS=--owner %1 --repo %2 --user %3 --password %4 
node setlabelcolor.js %ARGS% --color ffff80 --labelfilter "^D -"
node setlabelcolor.js %ARGS% --color 69d100 --labelfilter "^Co -"
node setlabelcolor.js %ARGS% --color CC0033 --labelfilter "^C -"
node setlabelcolor.js %ARGS% --color 5319e7 --labelfilter "Jira Migrated"
node setlabelcolor.js %ARGS% --color 5319e7 --labelfilter "ALM Migrated"
node setlabelcolor.js %ARGS% --color 765ec1 --labelfilter "^Epic -"
node setlabelcolor.js %ARGS% --color 7f8c8d --labelfilter "^T[1-9] -"
node setlabelcolor.js %ARGS% --color ff0000 --labelfilter "^S[1-2] -"
node setlabelcolor.js %ARGS% --color f0ad4e --labelfilter "^S[3-4] -"
node setlabelcolor.js %ARGS% --color 6A6337 --labelfilter "^V -"
node setlabelcolor.js %ARGS% --color 33FFF9 --labelfilter "^SP -"










