const WORKSHOP_ID = /^\d{5,}$/;
const WORKSHOP_PAGE =
	/^(?:https?:\/\/)?steamcommunity\.com\/(?:sharedfiles|workshop)\/filedetails\/?\?(?:[^#]*&)?id=(\d+)/i;
const STEAM_PROTOCOL = /^steam:\/\/url\/CommunityFilePage\/(\d+)/i;

export function parseWorkshopId(text: string): string | null {
	const trimmed = text.trim();
	if (WORKSHOP_ID.test(trimmed)) return trimmed;
	const match = WORKSHOP_PAGE.exec(trimmed) ?? STEAM_PROTOCOL.exec(trimmed);
	return match?.[1] ?? null;
}
