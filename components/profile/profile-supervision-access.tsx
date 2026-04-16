"use client";

import { useEffect, useMemo, useState } from "react";

import type { SupervisionGrant, SupervisionSection } from "@/lib/planner-types";
import { cn } from "@/lib/utils";
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

type PendingRevoke = {
  countdown: number;
  grantId: string;
  supervisorEmail: string;
};

function RevokeDialog({
  onCancel,
  onConfirm,
  state,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  state: PendingRevoke;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm">
      <div className="paper-panel w-full max-w-md rounded-[32px] p-6">
        <div className="text-xs uppercase tracking-[0.2em] text-danger">Отзыв доступа</div>
        <h3 className="mt-3 break-all text-xl font-semibold text-ink">{state.supervisorEmail}</h3>
        <p className="mt-3 text-sm leading-7 text-muted">
          Супервайзер потеряет доступ к аккаунту. Кнопка подтверждения станет активной после обратного отсчёта.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="rounded-[20px] border border-line bg-paper px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-ink"
            onClick={onCancel}
            type="button"
          >
            Отмена
          </button>
          <button
            className={cn(
              "rounded-[20px] px-4 py-3 text-sm font-medium transition-colors",
              state.countdown > 0
                ? "cursor-not-allowed border border-line bg-canvas text-muted"
                : "border border-danger bg-danger text-white",
            )}
            disabled={state.countdown > 0}
            onClick={onConfirm}
            type="button"
          >
            {state.countdown > 0 ? `Отозвать (${state.countdown})` : "Отозвать"}
          </button>
        </div>
      </div>
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
  const [editingGrantId, setEditingGrantId] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<PendingRevoke | null>(null);
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

  useEffect(() => {
    if (!pendingRevoke || pendingRevoke.countdown === 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setPendingRevoke((current) =>
        current ? { ...current, countdown: Math.max(0, current.countdown - 1) } : current,
      );
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [pendingRevoke]);

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
      setEditingGrantId(null);
      setSuccessMessage("Разделы обновлены.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось обновить разделы.");
    } finally {
      setSavingGrantId(null);
    }
  }

  async function handleConfirmRevoke() {
    if (!pendingRevoke) {
      return;
    }
    const { grantId } = pendingRevoke;
    setPendingRevoke(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deleteSupervisorGrant(grantId);
      setSuccessMessage("Доступ отозван.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось отозвать доступ.");
    }
  }

  return (
    <div className="space-y-5">
      {pendingRevoke ? (
        <RevokeDialog
          onCancel={() => setPendingRevoke(null)}
          onConfirm={() => void handleConfirmRevoke()}
          state={pendingRevoke}
        />
      ) : null}

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

        <div className="mt-4 flex flex-wrap gap-2">
          {SECTION_OPTIONS.map((option) => {
            const checked = createSections.includes(option.value);
            return (
              <label
                key={option.value}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-2 text-xs font-medium text-ink"
              >
                <input
                  checked={checked}
                  className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
                  disabled={submitting}
                  onChange={(event) => {
                    setCreateSections((current) =>
                      toggleSection(current, option.value, event.target.checked),
                    );
                  }}
                  type="checkbox"
                />
                {option.label}
              </label>
            );
          })}
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
          <div className="rounded-[24px] border border-line bg-paper/70 px-4 py-4 text-sm text-muted">
            Загружаем доступы...
          </div>
        ) : null}

        {grantsStatus !== "loading" && !hasAnyGrant ? (
          <div className="rounded-[24px] border border-line bg-paper/70 px-4 py-4 text-sm text-muted">
            Пока никому не выдан доступ к аккаунту.
          </div>
        ) : null}

        {sortedGrants.map((grant) => {
          const isEditing = editingGrantId === grant.id;
          const isSaving = savingGrantId === grant.id;
          const sections = draftSections[grant.id] ?? grant.sections;

          return (
            <article key={grant.id} className="rounded-[24px] border border-line bg-paper/70">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <span className="block break-all text-sm text-ink">{grant.supervisorEmail}</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {grant.sections.map((section) => (
                      <span
                        key={section}
                        className="rounded-full border border-line bg-canvas px-2 py-0.5 text-xs text-muted"
                      >
                        {sectionLabel(section)}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  aria-label="Редактировать доступы"
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border text-sm transition-colors",
                    isEditing
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line bg-canvas text-muted hover:border-accent hover:text-accent",
                  )}
                  onClick={() => setEditingGrantId(isEditing ? null : grant.id)}
                  type="button"
                >
                  ⚙
                </button>

                <button
                  aria-label="Отозвать доступ"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border border-line bg-canvas text-sm text-muted transition-colors hover:border-danger hover:text-danger"
                  onClick={() => {
                    setEditingGrantId(null);
                    setPendingRevoke({
                      countdown: 5,
                      grantId: grant.id,
                      supervisorEmail: grant.supervisorEmail,
                    });
                  }}
                  type="button"
                >
                  ✕
                </button>
              </div>

              {isEditing ? (
                <div className="border-t border-line px-4 pb-4 pt-3">
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
                            disabled={isSaving}
                            onChange={(event) => {
                              setDraftSections((current) => ({
                                ...current,
                                [grant.id]: toggleSection(
                                  current[grant.id] ?? grant.sections,
                                  option.value,
                                  event.target.checked,
                                ),
                              }));
                            }}
                            type="checkbox"
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      className="rounded-[14px] border border-line bg-canvas px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
                      onClick={() => {
                        setEditingGrantId(null);
                        setDraftSections((current) => ({ ...current, [grant.id]: grant.sections }));
                      }}
                      type="button"
                    >
                      Отмена
                    </button>
                    <button
                      className="rounded-[14px] border border-line bg-canvas px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSaving}
                      onClick={() => void handleSaveGrant(grant)}
                      type="button"
                    >
                      {isSaving ? "Сохраняем..." : "Сохранить"}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
