import type { RendererApi } from "./index.js";

type AssertExtends<T extends U, U> = T;

type _WindowApiToRendererApi = AssertExtends<
  NonNullable<Window["api"]>,
  RendererApi
>;

type _RendererApiToWindowApi = AssertExtends<
  RendererApi,
  NonNullable<Window["api"]>
>;

export type WindowApiContract = _WindowApiToRendererApi &
  _RendererApiToWindowApi;
