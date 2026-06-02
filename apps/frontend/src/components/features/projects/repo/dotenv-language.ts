import { StreamLanguage } from "@codemirror/language";

interface DotenvState {
  /** True once `=` has been consumed on the current line, so the rest is a value. */
  inValue: boolean;
}

/**
 * Minimal CodeMirror `StreamLanguage` for `.env` files. CodeMirror ships no dotenv
 * grammar, so this tokenizes the few constructs that matter: `#` comments, an
 * optional `export` prefix, the `KEY` before `=`, the `=` operator, and the value
 * (with `$VAR` / `${VAR}` interpolation highlighted). Anything unrecognized falls
 * back to a string token so highlighting never blocks editing.
 *
 * Exported as a module-level constant: a stable reference keeps the editor's
 * extensions array referentially stable without `useMemo` (see `code-editor`).
 */
export const dotenvLanguage = StreamLanguage.define<DotenvState>({
  name: "dotenv",
  startState() {
    return { inValue: false };
  },
  token(stream, state) {
    if (stream.sol()) {
      state.inValue = false;
      stream.eatSpace();
      if (stream.eol()) {
        return null;
      }
    }

    if (state.inValue) {
      if (stream.match(/^\$\{[^}]*\}/) || stream.match(/^\$[A-Za-z_][A-Za-z0-9_]*/)) {
        return "variableName";
      }
      if (stream.match(/^[^$]+/)) {
        return "string";
      }
      stream.next();
      return "string";
    }

    if (stream.peek() === "#") {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.match(/^export\b/)) {
      return "keyword";
    }
    stream.eatSpace();
    if (stream.eat("=")) {
      state.inValue = true;
      return "operator";
    }
    if (stream.match(/^[^=\s#]+/)) {
      return "propertyName";
    }

    stream.next();
    return null;
  },
});
