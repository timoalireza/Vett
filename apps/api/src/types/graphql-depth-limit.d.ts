declare module "graphql-depth-limit" {
  import { ValidationRule } from "graphql";
  
  function depthLimit(
    maxDepth: number,
    options?: { ignore?: string[] },
    callback?: (depths: number[]) => void
  ): ValidationRule;
  
  export default depthLimit;
}

