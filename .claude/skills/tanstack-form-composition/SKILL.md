---
name: tanstack-form-composition
description: >-
  Migrate a React @tanstack/react-form codebase from the prop-drilled
  `useForm` + erased-form-type pattern to the official `createFormHook`
  composition API (`useAppForm` / `withForm` / `field.X`). Use when a project
  threads a `form` object (often cast to an `any`-erased type like
  `ReactFormExtendedApi<any,...>`) through field-wrapper components that take
  `form`+`name` props, and you want typed field names/values, no casts, and
  reusable bound field components. Triggers: "migrate forms to createFormHook",
  "adopt useAppForm/withForm", "remove AnyReactForm cast", "type-safe tanstack
  form fields".
---

# TanStack Form → composition API migration

Convert a React project using `@tanstack/react-form` from **raw `useForm` +
prop-drilled field wrappers + an `any`-erased form type** to the **`createFormHook`
composition API**. The payoff: typed field names/values, deletion of the erased
form type and every `as unknown as <ErasedForm>` cast, and bound field components
consumed as `field.TextField` instead of `<FieldWrapper form={form} name=… />`.

This is for the **React** adapter. Solid/Vue/Angular have the same API shape with
different hook names — the concepts below port directly.

## When this applies

The codebase has most of these symptoms:

- An erased form type alias, e.g. `type AnyForm = ReactFormExtendedApi<any,any,…>`
  (12 `any` generics), used as a prop type and reached via `form as unknown as AnyForm`.
- Field components that accept `form` + `name` props and internally render
  `<form.Field name={name}>…</form.Field>`.
- Shared "section" components that receive the whole `form` as a prop and are
  reused across multiple parent forms (e.g. a settings form and an onboarding wizard).
- Helper functions that take the `form` and call `getFieldValue`/`setFieldValue`.

If the project does **not** yet use `@tanstack/react-form`, stop — this skill
migrates an existing TanStack Form codebase; it does not introduce the library.

## Method

Work in four phases. Do recon fully before editing; build the shared infra once;
then migrate call sites; then delete the erased type and verify. On a large repo,
migrate one simple form end-to-end first as a reference, then fan out.

### Phase 0 — Recon

Confirm the version and map the blast radius. Run (adapt paths):

- Dependency: grep `package.json` for `@tanstack/react-form` (need v1+; `createFormHook`,
  `createFormHookContexts`, `withForm` are stable in v1).
- Form-creation sites: search `useForm(`.
- The erased type + casts: search the alias name and `as unknown as`.
- Existing field wrappers: the directory of components taking `form`/`name` props.
- Shared sections: components whose props include the erased form type.
- Form-consuming helpers: functions whose parameter is the erased form type.

Record every hit; these are your edit targets. Note which field wrappers are
actually used (unused ones still get converted for library consistency, but have
no call sites to update).

### Phase 1 — Build the composition infra (once per form tree)

Create these alongside the existing field components (e.g. `components/ui/form/`).

**`form-context.ts`** — shared contexts, isolated to avoid a circular import with
the hook:

```ts
import { createFormHookContexts } from "@tanstack/react-form";

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();
```

**`error-message.ts`** — one extractor (field `meta.errors` may hold Zod issue
objects, strings, or thrown values):

```ts
export function firstErrorMessage(errors: ReadonlyArray<unknown>): string | undefined {
  const first = errors[0];
  if (!first) return undefined;
  if (typeof first === "string") return first;
  return (first as { message?: string }).message ?? String(first);
}
```

**Bound field components** — each reads `useFieldContext<T>()` instead of taking
`form`/`name`. `useFieldContext<T>()` is a _local cast_: it does not enforce that
`T` matches the actual field, so pick the widest value the component handles.

```tsx
// thin wrapper over a presentational base component
export function TextField(props: TextFieldProps): ReactElement {
  const field = useFieldContext<string | number | null | undefined>();
  return (
    <BaseTextField
      value={field.state.value ?? ""}
      onChange={(e) => field.handleChange(/* coerce per type */ e.target.value)}
      onBlur={field.handleBlur}
      errorText={firstErrorMessage(field.state.meta.errors)}
      {...props}
    />
  );
}
```

**Form-level `SubmitButton`** — subscribes to submit state:

```tsx
export function SubmitButton(props: SubmitButtonProps): ReactElement {
  const { children, disabled, ...rest } = props;
  const form = useFormContext();
  return (
    <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
      {([canSubmit, isSubmitting]) => (
        <Button type="submit" disabled={disabled || !canSubmit || isSubmitting} {...rest}>
          {children}
        </Button>
      )}
    </form.Subscribe>
  );
}
```

Keep `type="submit"` and let the enclosing `<form onSubmit>` drive submission;
expose `disabled` so callers fold in external state (e.g. a pending mutation that
the form's own `isSubmitting` doesn't observe).

**`index.ts`** — wire the hook. Name the bound components so the registry keys are
shorthand:

```ts
import { createFormHook } from "@tanstack/react-form";
import { fieldContext, formContext } from "./form-context";

// import bound field components + SubmitButton

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, Select, Phone, Switch /* … */ },
  formComponents: { SubmitButton },
});
```

### Phase 2 — Migrate call sites

**Form creation:** `useForm({ … })` → `useAppForm({ … })`. Same options object
(`defaultValues`, `validators`, `onSubmit`). Delete the `const formApi = form as
unknown as AnyForm` line.

**Fields:** prop-drilled → composition render prop.

```tsx
// before
<FormTextField form={formApi} name="email" label="Email" type="email" />
// after
<form.AppField name="email">
  {(field) => <field.TextField label="Email" type="email" />}
</form.AppField>
```

`form.AppField` type-checks `name` against the form's data shape and types
`field.state.value` / `field.handleChange`. One-off custom controls also work
inside `AppField` via `field.state` / `field.handleChange` (the `field` arg carries
both the API and the bound components).

**Submit:** wrap in `form.AppForm` and use `form.SubmitButton` where it fits
(simple dialogs). Forms with bespoke submit UX (steppers, mode-dependent labels)
keep a custom button but still benefit from the typed form.

**Shared sections → `withForm`.** This is usually the biggest cleanup: it removes
the erased-type threading while keeping types across the boundary.

```tsx
export const PersonalSection = withForm({
  defaultValues: DEFAULTS, // type-only; must match the parent form's data type
  props: { title: "" }, // optional extra props with defaults
  render: function PersonalSection({ form, title }) {
    return (
      <form.AppField name="firstName">
        {(field) => <field.TextField label="First name" />}
      </form.AppField>
    );
  },
});
// consumed by the parent, passing its typed useAppForm instance:
<PersonalSection form={form} title="…" />;
```

- `defaultValues` is for type inference only (not runtime). It must match the
  consuming `useAppForm`'s data type — reuse the project's shared `DEFAULTS` constant.
- `withForm` calls `render` during its own component's render, so **hooks inside
  `render` are safe** (state, queries, effects). Name the render function
  PascalCase so lint treats it as a component.
- A child that only reads state (a validation summary, a derived banner) is also a
  clean `withForm`.

**Helper functions that take the form:** do **not** reintroduce `any`. Define a
minimal structural interface with the literal field-name union it touches — the
typed form is assignable to it:

```ts
type ProfileTextField = "firstName" | "lastName" | "email" | /* … */;

interface ProfileFieldWriter {
  getFieldValue: (name: ProfileTextField) => unknown;
  setFieldValue: (name: ProfileTextField, value: string) => void;
}

export function applyToForm(form: ProfileFieldWriter, data: …): void { /* … */ }
```

**Array fields:** `mode="array"` plus bracket paths (type-check fine — a template
literal with a `number` variable widens to `` `items[${number}].field` ``):

```tsx
<form.AppField name="items" mode="array">
  {(field) =>
    field.state.value.map((_, i) => (
      <form.AppField key={i} name={`items[${i}].label`}>
        {(sub) => <sub.TextField label="Label" />}
      </form.AppField>
    ))
  }
</form.AppField>
```

### Phase 3 — Cleanup + verify

- Delete the erased form type file/alias; confirm zero references remain.
- Optionally drop redundant prefixes on bound components (they're consumed as
  `field.TextField`, so a `Form` prefix is noise) and rename files to match.
- Run the project's **typecheck**, then **lint**, then **formatter**, and fix
  fallout. The most common new errors are real bugs the `any` erasure hid —
  especially number text fields whose `handleChange(null)`/`Number(x)` now meets a
  typed field. Resolve by widening the bound component's `useFieldContext` union
  (`string | number | null | undefined`) rather than re-adding `any`.

## Key decisions & gotchas

- **Presentational base vs. thin wrapper — how deep?** Two layers (a controlled,
  form-agnostic base component + a thin context wrapper) is cleanest, and lets the
  base be reused outside forms. But the base layer earns its keep mainly when the
  UI library needs heavy per-instance wrapping (e.g. **react-native-paper**:
  outline radii, helper-text layout, labeled rows). When components are already
  "complete" and themed globally (e.g. **MUI**), a base for trivial controls
  (checkbox/switch/toggle/select) is just indirection — split only the substantive
  ones (text/currency/multiselect) and keep the rest as direct thin bindings.
- **Naming collisions.** Bound components named `TextField` / `Select` / `Switch`
  shadow the UI library's exports. Alias the import in that file
  (`import { TextField as MuiTextField } from "…"`, or the base `as BaseTextField`).
- **`useFieldContext<T>()` is a cast, not a constraint.** It won't error if `T`
  disagrees with the actual field; choose the widest value the component renders.
- **Don't force every form into `SubmitButton`.** Steppers and multi-action footers
  legitimately keep custom buttons; the typed form is the real win.
- **Migrate incrementally.** The new infra can coexist with old prop-drilled
  wrappers, so you can convert one form at a time and keep the project compiling.

## Definition of done

Typecheck, lint, and formatter all pass; the erased form type is gone; every
`useForm` is now `useAppForm`; field components are consumed via `form.AppField` /
`field.X`; shared sections and form-consuming helpers are typed (via `withForm` and
structural accessors) with no `any`.
