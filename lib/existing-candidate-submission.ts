export function existingCandidateForm(candidate: any) {
  const name = String(candidate.fullName || '').trim().split(/\s+/);
  const text = (value: any) => value == null ? '' : String(value);
  const skills = candidate.skills || candidate.primarySkills || [];
  const bench = String(candidate.source || candidate.sourceCategory || '').toLowerCase() === 'bench';
  return {
    firstName: candidate.firstName || name[0] || '', lastName: candidate.lastName || name.slice(1).join(' '),
    email: candidate.email || '', phone: candidate.phone || candidate.mobile || '',
    totalExperienceYears: text(candidate.totalExperienceYears ?? candidate.experienceYears),
    relevantExperienceYears: text(candidate.relevantExperienceYears),
    currentLocation: candidate.currentLocation || candidate.location || candidate.rawCurrentLocation || [candidate.city, candidate.state].filter(value => value && value !== 'Unknown').join(', '),
    preferredLocations: Array.isArray(candidate.preferredLocations) ? candidate.preferredLocations.join(', ') : candidate.preferredLocations || '',
    source: bench ? 'Bench' : 'Market', sourceChannel: bench ? '' : 'Existing Talent Pool', sourceDetail: '',
    skills: Array.isArray(skills) ? skills.map((skill: any) => typeof skill === 'string' ? skill : skill.name || skill.skillName || '').filter(Boolean).join(', ') : text(skills),
    currentCtc: text(candidate.currentCtc ?? candidate.currentCTC), expectedCtc: text(candidate.expectedCtc ?? candidate.expectedCTC),
    currentCompany: candidate.currentCompany || '', noticePeriodDays: text(candidate.noticePeriodDays), availabilityToStart: candidate.availabilityToStart || '',
  };
}
