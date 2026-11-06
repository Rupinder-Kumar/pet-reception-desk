# Manual smoke test against the real backend

Automated tests use a fake of the API. This 10–15 minute checklist covers what they cannot: the **real** backend and the **real** browser.
Fill in the result column and keep the file — it is your evidence in the interview.

**Setup**

```bash
# A — backend (Java 17+, or Docker)
git clone https://github.com/spring-petclinic/spring-petclinic-rest.git && cd spring-petclinic-rest && ./mvnw spring-boot:run
#   or: docker run -p 9966:9966 springcommunity/spring-petclinic-rest
curl http://localhost:9966/petclinic/actuator/health          # expect {"status":"UP"}

# B — frontend
npm install && npm run dev                                    # http://localhost:5173
```

> Expected values below assume the **standard PetClinic sample data** (10 owners, e.g. George Franklin with cat Leo). Your counts may differ — compare with what `GET /petclinic/api/owners` returns and note any difference.

| ID  | Action                                                                                                                                                       | Expected                                                                                                                | Result (✅/❌) | Notes |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | -------------- | ----- |
| S1  | Open `http://localhost:5173`                                                                                                                                 | Owner list appears (`10 owners` with sample data); no console errors                                                    |                |       |
| S2  | Search `davis`                                                                                                                                               | Only the Davis owners; count reads `2 of 10 owners`; no new network request while typing (Network tab)                  |                |       |
| S3  | Search `608 555 1023`                                                                                                                                        | George Franklin only (phone matches regardless of formatting)                                                           |                |       |
| S4  | Search `leo`                                                                                                                                                 | George Franklin (matched through pet name)                                                                              |                |       |
| S5  | Search `madison`                                                                                                                                             | Owners living in Madison (matched through city)                                                                         |                |       |
| S6  | Click George Franklin                                                                                                                                        | Owner panel appears instantly: address, city, phone; pet **Leo** (cat) listed                                           |                |       |
| S7  | Click Leo                                                                                                                                                    | Pet panel with type/birth date; "No previous visits." (or his visits, newest first); URL is `/owners/1/pets/1`          |                |       |
| S8  | Type "Smoke test visit", **Register visit**                                                                                                                  | Entry appears immediately with "Saving…", then settles; "Visit registered."; **F5 reload keeps it**                     |                |       |
| S9  | Submit the visit form with an empty description                                                                                                              | Inline error; **no request** sent (Network tab)                                                                         |                |       |
| S10 | Open an owner whose pet has several visits (e.g. Jean Coleman)                                                                                               | Visits listed newest first with formatted dates                                                                         |                |       |
| S11 | Betty Davis → **Add pet**: name `Smokey`, past birth date, type `dog`                                                                                        | Dialog closes; Smokey appears and is selected. A future birth date is rejected inline                                   |                |       |
| S12 | **Edit owner**: telephone → 20 digits saves; 21 digits and `+1555` rejected                                                                                  | Inline validation messages; 20 digits saved and visible                                                                 |                |       |
| S13 | **Edit pet**: rename                                                                                                                                         | Heading and list update                                                                                                 |                |       |
| S14 | Clear search; **New owner**: Zed / Zeta / 1 Main St / Austin / 5125550000                                                                                    | Dialog closes; Zed Zeta is selected; search `zeta` finds them                                                           |                |       |
| S15 | Conflict: tab A opens **Edit owner** for X; tab B changes X's city and saves; tab A edits phone and saves                                                    | Tab A shows "changed by someone else…"; nothing saved; reopening shows tab B's data                                     |                |       |
| S16 | Open `/owners/1/pets/1` in a new tab; then `/owners/2/pets/1`                                                                                                | First shows Leo; second shows "does not belong to the selected owner"                                                   |                |       |
| S17 | Stop the backend, reload                                                                                                                                     | Error "Cannot reach the clinic server…" with **Retry**; start backend, click Retry → list loads                         |                |       |
| S18 | Toggle dark mode; shrink window below ~600 px; Tab through the form; Esc in a dialog                                                                         | Theme switches; single column; focus visible; Esc closes dialog and focus returns to the opener                         |                |       |
| S19 | Check the browser console during S1–S18                                                                                                                      | No errors, no unhandled promise rejections                                                                              |                |       |
| S20 | In Swagger UI (`/petclinic/swagger-ui.html`) check `GET /owners` params, `PUT /owners/{id}` response, owner `telephone` max length; is `/v2/owners` present? | Matches `contract/openapi.yml`. If not: refresh the snapshot (`contract/README.md`), run `npm test`, record what failed |                |       |

**Run log:** date ______ · backend version/commit ______ · browser ______ · passed ___ / 20 · differences from the spec snapshot ______

## If something fails

| Symptom                               | Likely cause / fix                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Blank list, network errors in console | Backend not on `localhost:9966` or context path differs; check `curl …/actuator/health`; set `VITE_API_BASE` |
| CORS error                            | You bypassed the proxy with `VITE_API_BASE`; use the default dev server or enable CORS on the backend        |
| `401`/`403` on every call             | Backend started with `petclinic.security.enable=true`; turn it off (the app has no login UI)                 |
| `400` with validation text on save    | A rule differs between your build and the snapshot (S20); read the message — it comes from the backend       |
| Port 5173 or 9966 busy                | `npm run dev -- --port 5174`; or stop the other process / change the backend port and the Vite proxy target  |
| `./mvnw` fails                        | Java 17+ required (`java -version`); or use the Docker image                                                 |
