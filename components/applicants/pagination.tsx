"use client";
import { TablePagination } from '@/components/shared/table-pagination';
interface PaginationProps { currentPage: number; totalPages: number; totalRecords: number; pageSize: number; onPageChange: (page:number)=>void; onPageSizeChange: (size:number)=>void }
export default function ApplicantPagination(props: PaginationProps) { return <TablePagination page={props.currentPage} pageSize={props.pageSize} total={props.totalRecords} onPageChange={props.onPageChange} onPageSizeChange={props.onPageSizeChange} />; }
