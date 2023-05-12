import os
import re
from github import Github

# Get GHE environment from env variables already set for GH
TOKEN = os.getenv('GITHUB_ENTERPRISE_TOKEN')
HOST = os.getenv('GH_HOST')

# Create a Github instance:
# using an access token
g = Github("access_token")

# Github Enterprise with custom hostname
g = Github(base_url="https://" + HOST + "/api/v3", login_or_token = TOKEN)

# Let's get some issues
repo = g.get_repo("cms-test-migration/nfvd")
issues = repo.get_issues(state='all', labels= ['T1 - Defect'])
print("Examining", issues.totalCount, "issues")
for issue in issues:
#    print(issue)
    x = re.search("(?m)^>[ ]*version[ ]*(.*)$", issue.body)
    if x == None:
        # Let's try to determine one
#        y = re.search("(?m)^[*][*]CMS Found in Version[*][*][|](.*)$", issue.body)
        y = re.search("(?m)^NFV-D/SDC\.D version: (.+)$", issue.body)   
        if y != None:
            print("  => ", y.groups()[0])

            # Let's build a nice string then.
            version = '> version ' + y.groups()[0] + '\n'
            new_body = issue.body[0: y.span()[0]] + version + issue.body[y.span()[1]:]
#            print(new_body)

            issue.edit(body = new_body)
        else:
            print(issue)            
            print("  No version string found")

#    else:
#        print("  Version string found: ", x.groups()[0])
