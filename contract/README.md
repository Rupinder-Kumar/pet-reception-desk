# API contract snapshot

`openapi.yml` is a verbatim copy of the Spring PetClinic REST OpenAPI document
(<https://github.com/spring-petclinic/spring-petclinic-rest>, `src/main/resources/openapi.yml`, master, fetched 2026-11-05).
It is **read-only reference data** for `src/contract.test.ts` — the backend itself is untouched.

Refresh it when you run a different backend build:

```bash
curl -L https://raw.githubusercontent.com/spring-petclinic/spring-petclinic-rest/master/src/main/resources/openapi.yml -o contract/openapi.yml
# or the build you actually run:  curl http://localhost:9966/petclinic/v3/api-docs ...   (JSON also works after converting)
npm test    # contract tests tell you what drifted
```
