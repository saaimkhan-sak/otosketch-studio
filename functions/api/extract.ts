import worker, { type Env } from "../../worker/src/index";

interface PagesFunctionContext {
  request: Request;
  env: Env;
}

export function onRequest(context: PagesFunctionContext) {
  return worker.fetch(context.request, context.env);
}
