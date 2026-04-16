import { api } from "@/lib/api";
import {
  mapApiSupervisionGrant,
  mapApiSupervisionOwner,
  type ApiSupervisionGrant,
  type ApiSupervisionOwner,
} from "@/lib/planner-api";
import { setViewAsOwnerId } from "@/lib/view-as";

import type { AppSliceCreator, SupervisionSlice } from "./shared";

function resetServerCaches() {
  return {
    calendarConnections: [],
    calendarConnectionsStatus: "idle" as const,
    calendarRangeLoadStates: {},
    calendarRanges: {},
    googleCalendarAccountLabel: null,
    googleCalendarConnected: false,
    googleCalendarOptions: [],
    googleCalendarOptionsStatus: "idle" as const,
    habitLoadStates: {},
    monthLoadStates: {},
    months: {},
    taskExportFeeds: [],
    taskExportFeedsStatus: "idle" as const,
    weekEntryMeta: {},
    weekLoadStates: {},
    weeks: {},
  };
}

export const createSupervisionSlice: AppSliceCreator<SupervisionSlice> = (set, get) => ({
  accessibleOwners: [],
  accessibleOwnersStatus: "idle",
  supervisionGrants: [],
  supervisionGrantsStatus: "idle",
  viewingAs: null,

  fetchSupervisionGrants: async (force = false) => {
    const currentStatus = get().supervisionGrantsStatus;
    if (!force && (currentStatus === "loading" || currentStatus === "ready")) {
      return;
    }

    set({ supervisionGrantsStatus: "loading" });
    try {
      const grants = await api.get<ApiSupervisionGrant[]>("/supervision/grants");
      set({
        supervisionGrants: grants.map(mapApiSupervisionGrant),
        supervisionGrantsStatus: "ready",
      });
    } catch {
      set({ supervisionGrantsStatus: "error" });
    }
  },

  fetchAccessibleOwners: async (force = false) => {
    const currentStatus = get().accessibleOwnersStatus;
    if (!force && (currentStatus === "loading" || currentStatus === "ready")) {
      return;
    }

    set({ accessibleOwnersStatus: "loading" });
    try {
      const owners = await api.get<ApiSupervisionOwner[]>("/supervision/owners");
      const mappedOwners = owners.map(mapApiSupervisionOwner);
      const currentViewingAs = get().viewingAs;
      const nextViewingAs = currentViewingAs
        ? mappedOwners.find((owner) => owner.ownerId === currentViewingAs.ownerId) ?? null
        : null;
      setViewAsOwnerId(nextViewingAs?.ownerId ?? null);
      set({
        accessibleOwners: mappedOwners,
        accessibleOwnersStatus: "ready",
        viewingAs: nextViewingAs,
      });
    } catch {
      set({
        accessibleOwners: [],
        accessibleOwnersStatus: "error",
        viewingAs: null,
      });
      setViewAsOwnerId(null);
    }
  },

  addSupervisorGrant: async (supervisorEmail, sections) => {
    const grant = mapApiSupervisionGrant(
      await api.post<ApiSupervisionGrant>("/supervision/grants", {
        sections,
        supervisor_email: supervisorEmail,
      }),
    );
    set((state) => ({
      supervisionGrants: [grant, ...state.supervisionGrants.filter((item) => item.id !== grant.id)],
      supervisionGrantsStatus: "ready",
    }));
    return grant;
  },

  updateSupervisorGrant: async (grantId, sections) => {
    const grant = mapApiSupervisionGrant(
      await api.patch<ApiSupervisionGrant>(`/supervision/grants/${grantId}`, { sections }),
    );
    set((state) => ({
      supervisionGrants: state.supervisionGrants.map((item) => (item.id === grant.id ? grant : item)),
      supervisionGrantsStatus: "ready",
    }));
    return grant;
  },

  deleteSupervisorGrant: async (grantId) => {
    await api.delete(`/supervision/grants/${grantId}`);
    set((state) => ({
      supervisionGrants: state.supervisionGrants.filter((grant) => grant.id !== grantId),
      supervisionGrantsStatus: "ready",
    }));
  },

  startViewingAs: (ownerId) => {
    const owner = get().accessibleOwners.find((item) => item.ownerId === ownerId) ?? null;
    setViewAsOwnerId(owner?.ownerId ?? null);
    set({
      ...resetServerCaches(),
      viewingAs: owner,
    });
  },

  stopViewingAs: () => {
    setViewAsOwnerId(null);
    set({
      ...resetServerCaches(),
      viewingAs: null,
    });
  },

  resetSupervisionState: () => {
    setViewAsOwnerId(null);
    set({
      accessibleOwners: [],
      accessibleOwnersStatus: "idle",
      supervisionGrants: [],
      supervisionGrantsStatus: "idle",
      viewingAs: null,
      ...resetServerCaches(),
    });
  },
});
