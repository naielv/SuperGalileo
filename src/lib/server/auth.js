import { createHmac, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const SESSION_COOKIE = 'auth_session';
const FLOW_COOKIE = 'auth_flow';
const encoder = new TextEncoder();

function required(name) {
	const value = env[name];
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

function base64url(value) {
	return Buffer.from(value).toString('base64url');
}

function sign(value) {
	return createHmac('sha256', required('AUTH_SESSION_SECRET')).update(value).digest('base64url');
}

function pack(value) {
	const encoded = base64url(JSON.stringify(value));
	return `${encoded}.${sign(encoded)}`;
}

function unpack(value) {
	if (!value) return null;
	const [encoded, signature] = value.split('.');
	if (!encoded || sign(encoded) !== signature) return null;
	try {
		return JSON.parse(Buffer.from(encoded, 'base64url').toString());
	} catch {
		return null;
	}
}

async function discovery() {
	const issuer = required('AUTHENTIK_ISSUER').replace(/\/$/, '');
	return fetch(`${issuer}/.well-known/openid-configuration`).then((response) => {
		if (!response.ok) throw new Error('Unable to load Authentik OIDC configuration');
		return response.json();
	});
}

export async function beginLogin(cookies, url) {
	const config = await discovery();
	const state = randomBytes(24).toString('base64url');
	const nonce = randomBytes(24).toString('base64url');
	const verifier = randomBytes(48).toString('base64url');
	const challenge = base64url(await crypto.subtle.digest('SHA-256', encoder.encode(verifier)));
	cookies.set(FLOW_COOKIE, pack({ state, nonce, verifier }), {
		httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 600
	});
	const redirectUri = env.AUTHENTIK_REDIRECT_URI ?? `${url.origin}/auth/callback`;
	const params = new URLSearchParams({
		client_id: required('AUTHENTIK_CLIENT_ID'),
		response_type: 'code',
		redirect_uri: redirectUri,
		scope: 'openid profile email',
		state, nonce, code_challenge: challenge, code_challenge_method: 'S256'
	});
	return `${config.authorization_endpoint}?${params}`;
}

export async function completeLogin(cookies, url) {
	const flow = unpack(cookies.get(FLOW_COOKIE));
	if (!flow || flow.state !== url.searchParams.get('state')) throw new Error('Invalid OIDC state');
	const config = await discovery();
	const response = await fetch(config.token_endpoint, {
		method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
		grant_type: 'authorization_code', code: url.searchParams.get('code') ?? '',
			redirect_uri: env.AUTHENTIK_REDIRECT_URI ?? `${url.origin}/auth/callback`,
			client_id: required('AUTHENTIK_CLIENT_ID'), client_secret: required('AUTHENTIK_CLIENT_SECRET'),
			code_verifier: flow.verifier
		})
	});
	if (!response.ok) throw new Error('Authentik token exchange failed');
	const tokens = await response.json();
	const jwks = createRemoteJWKSet(new URL(config.jwks_uri));
	const { payload } = await jwtVerify(tokens.id_token, jwks, {
		issuer: config.issuer, audience: required('AUTHENTIK_CLIENT_ID'), nonce: flow.nonce
	});
	cookies.delete(FLOW_COOKIE, { path: '/' });
	cookies.set(SESSION_COOKIE, pack({ sub: payload.sub, ...payload }), {
		httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8
	});
}

export function readSession(cookies) {
	return unpack(cookies.get(SESSION_COOKIE));
}

export function clearSession(cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
