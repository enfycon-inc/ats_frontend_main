const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const form of ['IndiaStaffingForm', 'UsStaffingForm', 'GlobalStandardForm']) {
  test(`${form}: pod assignment never requests unauthorized recruiter options`, () => {
    const source = fs.readFileSync(path.join(__dirname, `../app/(dashboard)/job-posting/new/${form}.tsx`), 'utf8');
    const capability = source.match(/const canAssignRecruiters = (.*);/)[1];
    const effect = source.match(/setBranchUsers\(\[\]\);\s*if \((.*?)\) return;\s*const unit = availableUnits/)[1];
    const mayLoad = new Function('currentUserProfile', 'selectedUnitId', `const canAssignRecruiters = ${capability}; return !(${effect});`);
    for (const permissions of [[], ['job:assign_pod'], ['job:assign_recruiter'], ['job:override_assignment']]) {
      assert.equal(mayLoad({ permissions }, 'unit'), false);
    }
    const permissions = ['job:assign_recruiter', 'job:override_assignment'];
    assert.equal(mayLoad({ permissions }, 'unit'), true);
    assert.equal(mayLoad({ permissions }, ''), false);
    assert.equal(mayLoad(undefined, 'unit'), false);
  });
}
