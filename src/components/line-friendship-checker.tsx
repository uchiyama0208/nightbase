import { getLineFriendshipPreference } from "@/app/actions/user-preferences";
import { LineFriendshipCheckerClient } from "./line-friendship-checker-client";

export async function LineFriendshipChecker() {
    const { hidePrompt } = await getLineFriendshipPreference();

    return <LineFriendshipCheckerClient shouldHide={hidePrompt} />;
}
