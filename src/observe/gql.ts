import LoginInfo from "./LoginInfo";

/* The GQL API for Observe isn't officially documented, but the "check whether
 * a user is logged in" * endpoint is pretty straightforward. If it ever goes
 * away, there will be a REST API to replace it.
 */
export async function query(l: LoginInfo, q: string, v?: any): Promise<any> {
    const rslt = await fetch(l.getUrl('/v1/meta'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${l.customer} ${l.token}`
        },
        body: JSON.stringify({
            query: q,
            variables: v
        }),
        credentials: 'include',
        referrerPolicy: 'origin'
    });
    return await rslt.json();
};

