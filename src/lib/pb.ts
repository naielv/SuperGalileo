async function request(path: string, options: RequestInit = {}) {
	const response = await fetch(`/api/pb/${path}`, {
		...options,
		headers: {
			'content-type': 'application/json',
			...(options.headers ?? {})
		}
	});

	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new Error(body.message ?? `PocketBase request failed (${response.status})`);
	}

	return response.status === 204 ? null : response.json();
}

const users = {
	getFullList: () => request('users'),
	getOne: (id: string) => request(`users/${id}`),
	create: (data: unknown) => request('users', { method: 'POST', body: JSON.stringify(data) }),
	update: (id: string, data: unknown) =>
		request(`users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
	delete: (id: string) => request(`users/${id}`, { method: 'DELETE' })
};

export const pb = {
	collection(name: string) {
		if (name !== 'users') throw new Error(`Unsupported PocketBase collection: ${name}`);
		return users;
	}
};
