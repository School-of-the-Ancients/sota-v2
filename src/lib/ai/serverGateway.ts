import { AIGateway } from "./aiGateway";
import { EchoTextProvider } from "./providers/textProvider";
import { promptRunsRepo } from "../db/repositories/promptRunsRepo";
import { PassthroughSchemaValidator } from "../validation/schemas";

export function createServerAIGateway(): AIGateway {
  return new AIGateway({
    textProvider: new EchoTextProvider(),
    promptRunsRepo,
    schemaValidator: new PassthroughSchemaValidator(),
  });
}
