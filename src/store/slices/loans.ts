import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LoanStatus, LoanType } from "@/lib/domain";

export interface LoanListFilters {
  status: LoanStatus | "";
  type: LoanType | "";
}

export interface LoanApplyForm {
  loanType: LoanType;
  amount: string;
  durationMonths: number;
  monthlyIncome: string;
  employmentStatus: string;
  description: string;
  disbursementAccountId: string;
}

export interface LoansState {
  listFilters: LoanListFilters;
  applyForm: LoanApplyForm;
  /** Live EMI preview for the apply form (client-computed). */
  emi: { principalMinor: number; durationMonths: number; annualRateBps: number };
}

const initialApplyForm: LoanApplyForm = {
  loanType: "personal",
  amount: "",
  durationMonths: 6,
  monthlyIncome: "",
  employmentStatus: "salaried",
  description: "",
  disbursementAccountId: "",
};

const initialState: LoansState = {
  listFilters: { status: "", type: "" },
  applyForm: { ...initialApplyForm },
  emi: { principalMinor: 0, durationMonths: initialApplyForm.durationMonths, annualRateBps: 1200 },
};

export const loansSlice = createSlice({
  name: "loans",
  initialState,
  reducers: {
    setLoanFilters: (state, action: PayloadAction<Partial<LoanListFilters>>) => {
      Object.assign(state.listFilters, action.payload);
    },
    setLoanApplyForm: (state, action: PayloadAction<Partial<LoanApplyForm>>) => {
      Object.assign(state.applyForm, action.payload);
    },
    setEmiPreview: (state, action: PayloadAction<Partial<LoansState["emi"]>>) => {
      Object.assign(state.emi, action.payload);
    },
  },
});
