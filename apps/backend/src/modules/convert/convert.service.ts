import { singleton } from "tsyringe";
import { PARSERS, SERIALIZERS, type ConfigFormat } from "@/common/parsers";
import type { ConvertBody } from "./convert.schema";

@singleton()
export class ConvertService {
  convert(body: ConvertBody) {
    const parser = PARSERS[body.fromFormat as ConfigFormat];
    const entries = parser.parse(body.content);

    const serializer = SERIALIZERS[body.toFormat as ConfigFormat];
    const content = serializer.serialize(entries);

    return {
      content,
      fromFormat: body.fromFormat,
      toFormat: body.toFormat,
      entryCount: entries.length,
    };
  }
}
