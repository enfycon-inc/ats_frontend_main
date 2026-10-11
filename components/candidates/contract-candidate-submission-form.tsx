"use client";
import { CandidateForm, type CandidateFormProps } from './candidate-form';
export function ContractCandidateSubmissionForm(props: Omit<CandidateFormProps, 'isContractual'>) {
  return <CandidateForm {...props} isContractual />;
}
