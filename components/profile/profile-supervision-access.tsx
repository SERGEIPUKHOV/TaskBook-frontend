"use client";

import { useEffect, useMemo, useState } from "react";

import type { SupervisionGrant, SupervisionSection } from "@/lib/planner-types";
import { useAppStore } from "@/store/app-store";

const SECTION_OPTIONS: Array<{ label: string; value: SupervisionSection }> = [
  { value: "dashboard", label: "Дашборд" },
  { value: "month", label: "Месяц" },
  { value: "week", label: "Неделя" },
  { value: "day", label: "День" },
  { value: "calendar", label: "Календарь" },
];

function sectionLabel(section: SupervisionSection): string {
  return SECTION_OPTIONS.find((option) => option.value === section)?.label ?? section;
}

function GrantSectionEditor({
  disabled = false,
  onToggle,
  sections,
}: {
  disabled?: boolean;
  onToggle: (section: SupervisionSection, checked: boolean) => void;
  sections: SupervisionSection[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SECTION_OPTIONS.map((option) => {
        const checked = sections.includes(option.value);
        return (
          <label
            key={option.value}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-2 text-xs font-medium text-ink"
          >
            <input
              checked={checked}
              className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
              disabled={disabled}
              onChange={(event) => onToggle(option.value, event.target.checked)}
              type="checkbox"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

export function ProfileSupervisionAccess() {
  const grants = useAppStore((state) => state.supervisionGrants);
  const grantsStatus = useAppStore((state) => state.supervisionGrantsStatus);
  const fetchSupervisionGrants = useAppStore((state) => state.fetchSupervisionGrants);
  const addSupervisorGrant = useAppStore((state) => state.addSupervisorGrant);
  const updateSupervisorGrant = useAppStore((state) => state.updateSupervisorGrant);
  const deleteSupervisorGrant = useAppStore((state) => state.deleteSupervisorGrant);

  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [createSections, setCreateSections] = useState<SupervisionSection[]>(["dashboard", "month"]);
  const [draftSections, setDraftSections] = useState<Record<string, SupervisionSection[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [savingGrantId, setSavingGrantId] = useState<string | null>(null);
  const [deletingGrantId, setDeletingGrantId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchSupervisionGrants();
  }, [fetchSupervisionGrants]);

  useEffect(() => {
    setDraftSections((current) => {
      const next: Record<string, SupervisionSection[]> = {};
      for (const grant of grants) {
        next[grant.id] = current[grant.id] ?? grant.sections;
      }
      return next;
    });
  }, [grants]);

  const hasAnyGrant = grants.length > 0;
  const sortedGrants = useMemo(() => grants.slice(), [grants]);

  function toggleSection(
    sections: SupervisionSection[],
    section: SupervisionSection,
    checked: boolean,
  ): SupervisionSection[] {
    if (checked) {
      return sections.includes(section) ? sections : [...sections, section];
    }
    return sections.filter((value) => value !== section);
  }

  async function handleCreateGrant() {
    if (!supervisorEmail.trim()) {
      setErrorMessage("Укажи email супервайзера.");
      return;
    }
    if (createSections.length === 0) {
      setErrorMessage("Выбери хотя бы один раздел.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await addSupervisorGrant(supervisorEmail.trim(), createSections);
      setSupervisorEmail("");
      setCreateSections(["dashboard", "month"]);
      setSuccessMessage("Доступ сохранён.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось сохранить доступ.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveGrant(grant: SupervisionGrant) {
    const sections = draftSections[grant.id] ?? grant.sections;
    if (sections.length === 0) {
      setErrorMessage("У супервайзера должен остаться хотя бы один раздел.");
      return;
    }

    setSavingGrantId(grant.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updateSupervisorGrant(grant.id, sections);
      setSuccessMessage("Разделы обновлены.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось обновить разделы.");
    } finally {
      setSavingGrantId(null);
    }
  }

  async function handleDeleteGrant(grantId: string) {
    setDeletingGrantId(grantId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deleteSupervisorGrant(grantId);
      setSuccessMessage("Доступ удалён.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось удалить доступ.");
    } finally {
      setDeletingGrantId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-line bg-canvas/50 p-5">
        <div className="text-sm font-semibold text-ink">Добавить супервайзера</div>
        <p className="mt-1 text-sm leading-6 text-muted">
          Человек войдёт в свой аккаунт и сможет смотреть только выбранные разделы в режиме чтения.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <input
            className="h-11 rounded-[16px] border border-line bg-paper px-4 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
            onChange={(event) => setSupervisorEmail(event.target.value)}
            placeholder="supervisor@example.com"
            type="email"
            value={supervisorEmail}
          />
          <button
            className="h-11 rounded-[16px] border border-line bg-paper px-4 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            onClick={() => void handleCreateGrant()}
            type="button"
          >
            {submitting ? "Сохраняем..." : "Выдать доступ"}
          </button>
        </div>

        <div className="mt-4">
          <GrantSectionEditor
            disabled={submitting}
            onToggle={(section, checked) => {
              setCreateSections((current) => toggleSection(current, section, checked));
            }}
            sections={createSections}
          />
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-[22px] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-[22px] border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          {successMessage}
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="text-sm font-semibold text-ink">Текущие доступы</div>

        {grantsStatus === "loading" && !hasAnyGrant ? (
          <div className="rounded-[24px] border border-line bg-paper/70 px-4 py-4 text-sm text-muted">Загружаем доступы...</div>
        ) : null}

        {grantsStatus !== "loading" && !hasAnyGrant ? (
          <div className="rounded-[24px] border border-line bg-paper/70 px-4 py-4 text-sm text-muted">
            Пока никому не выдан доступ к аккаунту.
          </div>
        ) : null}

        {sortedGrants.map((grant) => {
          const sections = draftSections[grant.id] ?? grant.sections;
          const isDirty = JSON.stringify(sections) !== JSON.stringify(grant.sections);
          const isSaving = savingGrantId === grant.id;
          const isDeleting = deletingGrantId === grant.id;

          return (
            <article key={grant.id} className="rounded-[24px] border border-line bg-paper/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="break-all text-sm font-semibold text-ink">{grant.supervisorEmail}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                    <span className="rounded-full border border-line bg-canvas px-2.5 py-1">
                      {grant.status === "active" ? "Активен" : "Ожидает регистрации"}
                    </span>
                    {grant.sections.map((section) => (
                      <span key={section} className="rounded-full border border-line bg-canvas px-2.5 py-1">
                        {sectionLabel(section)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-[14px] border border-line bg-canvas px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!isDirty || isSaving}
                    onClick={() => void handleSaveGrant(grant)}
                    type="button"
                  >
                    {isSaving ? "Сохраняем..." : "Сохранить"}
                  </button>
                  <button
                    className="rounded-[14px] border border-line bg-canvas px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isDeleting}
                    onClick={() => void handleDeleteGrant(grant.id)}
                    type="button"
                  >
                    {isDeleting ? "Удаляем..." : "Удалить"}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <GrantSectionEditor
                  disabled={isSaving || isDeleting}
                  onToggle={(section, checked) => {
                    setDraftSections((current) => ({
                      ...current,
                      [grant.id]: toggleSection(current[grant.id] ?? grant.sections, section, checked),
                    }));
                  }}
                  sections={sections}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
