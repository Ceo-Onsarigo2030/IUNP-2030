import { NextResponse } from "next/server";

// Article likes were removed from the site. This tiny stand-in exists only so that an older copy
// of this file left behind in the repository can never break the build again. You may delete it.
const gone = () => NextResponse.json({ error: "Article likes have been removed." }, { status: 410 });
export const POST = gone;
export const DELETE = gone;
