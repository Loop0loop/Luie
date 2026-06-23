export type ColumnPatch = {
  table: string;
  column: string;
  sql: string;
};
export type IndexPatch = {
  name: string;
  table: string;
  sql: string;
};
