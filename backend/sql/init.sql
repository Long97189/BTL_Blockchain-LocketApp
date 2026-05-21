--
-- PostgreSQL database dump
--

\restrict 7Z0MTq6GMMFb2jKYJulTrH3ebwGISlqFSQIgoHR8WBSbhfHzGgIREcGuw8mxvJj

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.post_reactions DROP CONSTRAINT IF EXISTS post_reactions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.post_reactions DROP CONSTRAINT IF EXISTS post_reactions_post_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_post_id_fkey;
ALTER TABLE IF EXISTS ONLY public.friendship_milestones DROP CONSTRAINT IF EXISTS friendship_milestones_user_id_b_fkey;
ALTER TABLE IF EXISTS ONLY public.friendship_milestones DROP CONSTRAINT IF EXISTS friendship_milestones_user_id_a_fkey;
ALTER TABLE IF EXISTS ONLY public.friend_requests DROP CONSTRAINT IF EXISTS friend_requests_requester_id_fkey;
ALTER TABLE IF EXISTS ONLY public.friend_requests DROP CONSTRAINT IF EXISTS friend_requests_recipient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;
ALTER TABLE IF EXISTS ONLY public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
DROP INDEX IF EXISTS public.idx_posts_verified_onchain;
DROP INDEX IF EXISTS public.idx_posts_user_created_at;
DROP INDEX IF EXISTS public.idx_posts_minted_nft;
DROP INDEX IF EXISTS public.idx_post_reactions_post_created_at;
DROP INDEX IF EXISTS public.idx_messages_recipient_read_at;
DROP INDEX IF EXISTS public.idx_messages_participants_created_at;
DROP INDEX IF EXISTS public.idx_friendship_milestones_pair;
DROP INDEX IF EXISTS public.idx_friend_requests_recipient_status;
DROP INDEX IF EXISTS public.idx_follows_follower;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.posts DROP CONSTRAINT IF EXISTS posts_pkey;
ALTER TABLE IF EXISTS ONLY public.post_reactions DROP CONSTRAINT IF EXISTS post_reactions_pkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.friendship_milestones DROP CONSTRAINT IF EXISTS friendship_milestones_user_id_a_user_id_b_milestone_type_key;
ALTER TABLE IF EXISTS ONLY public.friendship_milestones DROP CONSTRAINT IF EXISTS friendship_milestones_pkey;
ALTER TABLE IF EXISTS ONLY public.friend_requests DROP CONSTRAINT IF EXISTS friend_requests_requester_id_recipient_id_key;
ALTER TABLE IF EXISTS ONLY public.friend_requests DROP CONSTRAINT IF EXISTS friend_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.follows DROP CONSTRAINT IF EXISTS follows_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.posts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.friendship_milestones ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.friend_requests ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.posts_id_seq;
DROP TABLE IF EXISTS public.posts;
DROP TABLE IF EXISTS public.post_reactions;
DROP SEQUENCE IF EXISTS public.messages_id_seq;
DROP TABLE IF EXISTS public.messages;
DROP SEQUENCE IF EXISTS public.friendship_milestones_id_seq;
DROP TABLE IF EXISTS public.friendship_milestones;
DROP SEQUENCE IF EXISTS public.friend_requests_id_seq;
DROP TABLE IF EXISTS public.friend_requests;
DROP TABLE IF EXISTS public.follows;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follows (
    follower_id bigint NOT NULL,
    following_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT follows_check CHECK ((follower_id <> following_id))
);


--
-- Name: friend_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friend_requests (
    id bigint NOT NULL,
    requester_id bigint NOT NULL,
    recipient_id bigint NOT NULL,
    status character varying(16) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    responded_at timestamp with time zone,
    CONSTRAINT friend_requests_check CHECK ((requester_id <> recipient_id))
);


--
-- Name: friend_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.friend_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: friend_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.friend_requests_id_seq OWNED BY public.friend_requests.id;


--
-- Name: friendship_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friendship_milestones (
    id bigint NOT NULL,
    user_id_a bigint NOT NULL,
    user_id_b bigint NOT NULL,
    milestone_type smallint NOT NULL,
    token_id bigint,
    tx_hash text DEFAULT ''::text NOT NULL,
    contract_address text DEFAULT ''::text NOT NULL,
    chain_id bigint,
    block_number bigint,
    minted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: friendship_milestones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.friendship_milestones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: friendship_milestones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.friendship_milestones_id_seq OWNED BY public.friendship_milestones.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id bigint NOT NULL,
    sender_id bigint NOT NULL,
    recipient_id bigint NOT NULL,
    post_id bigint,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    CONSTRAINT messages_sender_recipient_check CHECK ((sender_id <> recipient_id))
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: post_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_reactions (
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    reaction_type character varying(32) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    image_url text NOT NULL,
    caption text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    image_hash character varying(66) DEFAULT ''::character varying NOT NULL,
    content_hash character varying(66) DEFAULT ''::character varying NOT NULL,
    is_verified_onchain boolean DEFAULT false NOT NULL,
    proof_tx_hash text DEFAULT ''::text NOT NULL,
    proof_contract_address text DEFAULT ''::text NOT NULL,
    proof_attested_by text DEFAULT ''::text NOT NULL,
    proof_chain_id bigint,
    proof_block_number bigint,
    proof_recorded_at timestamp with time zone,
    is_minted_nft boolean DEFAULT false NOT NULL,
    nft_token_id bigint,
    nft_tx_hash text DEFAULT ''::text NOT NULL,
    nft_contract_address text DEFAULT ''::text NOT NULL,
    nft_chain_id bigint,
    nft_block_number bigint,
    nft_minted_at timestamp with time zone
);


--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    username character varying(50),
    bio text DEFAULT ''::text NOT NULL,
    avatar_url text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: friend_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests ALTER COLUMN id SET DEFAULT nextval('public.friend_requests_id_seq'::regclass);


--
-- Name: friendship_milestones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendship_milestones ALTER COLUMN id SET DEFAULT nextval('public.friendship_milestones_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: follows; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.follows (follower_id, following_id, created_at) FROM stdin;
2	1	2026-05-17 09:26:09.240081+00
1	2	2026-05-17 09:26:09.240081+00
2	3	2026-05-20 15:54:19.3508+00
3	2	2026-05-20 15:54:19.3508+00
2	4	2026-05-21 07:35:31.613196+00
4	2	2026-05-21 07:35:31.613196+00
2	5	2026-05-21 07:35:33.385108+00
5	2	2026-05-21 07:35:33.385108+00
2	6	2026-05-21 07:35:34.711979+00
6	2	2026-05-21 07:35:34.711979+00
4	1	2026-05-21 08:12:05.521641+00
1	4	2026-05-21 08:12:05.521641+00
4	3	2026-05-21 08:12:07.034106+00
3	4	2026-05-21 08:12:07.034106+00
4	5	2026-05-21 08:12:08.298708+00
5	4	2026-05-21 08:12:08.298708+00
4	6	2026-05-21 08:12:09.579816+00
6	4	2026-05-21 08:12:09.579816+00
5	1	2026-05-21 08:15:32.938872+00
1	5	2026-05-21 08:15:32.938872+00
5	3	2026-05-21 08:15:34.082751+00
3	5	2026-05-21 08:15:34.082751+00
5	6	2026-05-21 08:15:35.379672+00
6	5	2026-05-21 08:15:35.379672+00
6	1	2026-05-21 08:18:41.65472+00
1	6	2026-05-21 08:18:41.65472+00
6	3	2026-05-21 08:18:42.89179+00
3	6	2026-05-21 08:18:42.89179+00
\.


--
-- Data for Name: friend_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.friend_requests (id, requester_id, recipient_id, status, created_at, responded_at) FROM stdin;
\.


--
-- Data for Name: friendship_milestones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.friendship_milestones (id, user_id_a, user_id_b, milestone_type, token_id, tx_hash, contract_address, chain_id, block_number, minted_at) FROM stdin;
1	4	2	0	7	0xd86560f09a30bddad71a01b993f9d6e45c73b930c104853fe4192edf6f9d9b6b	0xb6dB2D772F8c13BeB811a16188A42C57135bfC4E	11155111	10890753	2026-05-21 08:36:36.216587+00
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, sender_id, recipient_id, post_id, body, created_at, read_at) FROM stdin;
1	7	2	1	Hello from API test	2026-05-21 07:54:30.268497+00	2026-05-21 07:56:10.493655+00
2	2	7	\N	brooo	2026-05-21 07:56:18.822253+00	\N
3	6	3	3	chị đi đâu vậy	2026-05-21 08:21:01.906066+00	\N
4	6	3	2	xe đẹp quá	2026-05-21 08:21:14.094727+00	\N
5	6	3	3	hi	2026-05-21 08:25:28.153436+00	\N
6	4	6	8	vui thế	2026-05-21 08:36:59.964279+00	\N
\.


--
-- Data for Name: post_reactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_reactions (post_id, user_id, reaction_type, created_at) FROM stdin;
6	2	love	2026-05-21 08:27:41.420092+00
6	2	joy	2026-05-21 08:27:43.146111+00
5	2	sad	2026-05-21 08:27:47.024754+00
7	3	joy	2026-05-21 08:28:21.421519+00
6	3	love	2026-05-21 08:28:24.452625+00
5	3	yellow_heart	2026-05-21 08:28:30.021583+00
9	3	joy	2026-05-21 08:33:43.720019+00
8	3	clap	2026-05-21 08:33:48.669707+00
9	4	love	2026-05-21 08:35:10.508361+00
8	4	yellow_heart	2026-05-21 08:35:13.540203+00
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.posts (id, user_id, image_url, caption, created_at, image_hash, content_hash, is_verified_onchain, proof_tx_hash, proof_contract_address, proof_attested_by, proof_chain_id, proof_block_number, proof_recorded_at, is_minted_nft, nft_token_id, nft_tx_hash, nft_contract_address, nft_chain_id, nft_block_number, nft_minted_at) FROM stdin;
1	2	https://res.cloudinary.com/dv0nscnyd/image/upload/v1779005720/locket/posts/xqn8gaqmrnvjvnuotnvy.jpg	Joke of the đay	2026-05-17 08:15:34.58+00	0x5163d02a6c6c9e15f209fdc5bc21928b5394b41b5780806dcd6f5bd1539583d4	0x06c72d59e95d1fe672234b21c3bac9ded8cd9726884d562f47543ce477ffd180	t	0x49977675fb976bd5ecabaef19a260e862ed978408944659cc5d726dcc041eb3c	0xD1fB76Ec07CA7de60BFC5554D410A433733e10D3	0x44e2bA1AdB3B7805a4499c6795b0E2B6F9184F49	11155111	10867360	2026-05-17 08:15:54.47169+00	t	4	0x87894253f6f06815d23f297c55a1c943fd4a35628d2f503319c6f6c218c9c180	0x87e5a0d27dF70FF87221744236B2A9dc333d66B7	11155111	10867389	2026-05-17 08:23:28.052642+00
2	3	https://res.cloudinary.com/dv0nscnyd/image/upload/v1779350932/locket/posts/bfsr9mqlgsbp4ajgzov4.jpg	xe mới nè	2026-05-21 08:09:02.94+00	0x024abe2b9f9d3f45b24152feb6c93bf0c444e4a6094dc324ae50efdf9a2088de	0x3fd72188b72e9ad6038419faea6f1eeb0fdb8b5026764b12fcbc139e1eaff4df	f				\N	\N	\N	f	\N			\N	\N	\N
3	3	https://res.cloudinary.com/dv0nscnyd/image/upload/v1779350984/locket/posts/mzhrlqoy8qrxp4nail6t.jpg	Hạ Long hè này là đẹp nhất	2026-05-21 08:09:54.936+00	0xc5eae35a5eab40db1f04c75eb6a01a877d4160b0940358497dbeafdb20064021	0xfbe4f04190bf36cc6d22469f7e870c19f504773b2b5bf16d50173d116dadd15c	t	0x4dee19d497f0984d791b28abb9223b7c06e678ef7ed30f534d243bf7101483bd	0xD1fB76Ec07CA7de60BFC5554D410A433733e10D3	0x44e2bA1AdB3B7805a4499c6795b0E2B6F9184F49	11155111	10890651	2026-05-21 08:11:38.433575+00	t	6	0xfbd3fc0c4af3821ef695f04396806fad06d5c71b601b8a6c9da97387cf88827d	0x87e5a0d27dF70FF87221744236B2A9dc333d66B7	11155111	10890651	2026-05-21 08:11:35.018223+00
6	5	https://res.cloudinary.com/dv0nscnyd/image/upload/v1779351362/locket/posts/nry6ym0ionh40xvw76bn.jpg	Cả nhà em đi Nha Trang	2026-05-21 08:16:12.736+00	0x6a575455e23a404c903db15268b02516f78e73255b478767f22e4280ba50cdc0	0x2c6f5c9347e5729edd38b4c1e1ceb4a0d14df7a77272c91a30c025e197d76e95	f				\N	\N	\N	f	\N			\N	\N	\N
7	5	https://res.cloudinary.com/dv0nscnyd/image/upload/v1779351488/locket/posts/ab2wx5c3hmn5sgekq6yi.jpg	bữa cơm cùng gia đinh	2026-05-21 08:18:18.96+00	0x278757cd380d7aebbf9b0f73e9a2a780ec31bdbabdccf372caaa25b68d428a8e	0x75dd074002081b5d781a0283c287ce843e9fe01da7046c99e3a0e2d6f60af51f	f				\N	\N	\N	f	\N			\N	\N	\N
8	6	https://res.cloudinary.com/dv0nscnyd/image/upload/v1779351576/locket/posts/b94kqkuiedib3xesxzfi.jpg	Họp lớp cấp 2	2026-05-21 08:19:47.558+00	0xeb69c31abe1074f5d6d8863fff25d2ee787664ab7f99f63b1685a1a588af4770	0x197895cbeeaf79f4c9bd79947759519369128677064bfba1ea308b99b2b2884e	f				\N	\N	\N	f	\N			\N	\N	\N
9	6	https://res.cloudinary.com/dv0nscnyd/image/upload/v1779351628/locket/posts/k6jd0qfbp9edubyohqyo.jpg	Góc làm việc mới	2026-05-21 08:20:38.812+00	0x8f638c02b04484c73d75d49aa3ecda131a2886ea7ea6ca0afdeb14f040238653	0xddee191b1a1b7e47735b3da94686796a6b473f45d9fd79378d366831821de157	f				\N	\N	\N	f	\N			\N	\N	\N
5	4	https://res.cloudinary.com/dv0nscnyd/image/upload/v1779351301/locket/posts/dl6bejgllngawju0dha9.jpg	xế hộp mới nhà em	2026-05-21 08:15:11.952+00	0x1c1045c852b3b4d2045d40d4d135e3225b4e8154966ed41c9267b720df39e873	0x0c88731ccb387370fe1a2c626e7a4e01c2484640c4e8d62864607572b041a7de	t	0x0a55773945f54c575c4f76576b2b554142da03d9aa0dd8ae15e56193e945c8ac	0xD1fB76Ec07CA7de60BFC5554D410A433733e10D3	0x44e2bA1AdB3B7805a4499c6795b0E2B6F9184F49	11155111	10890746	2026-05-21 08:34:50.650421+00	f	\N			\N	\N	\N
4	4	https://res.cloudinary.com/dv0nscnyd/image/upload/v1779351165/locket/posts/vslz8vexymrq0vk431lz.jpg	Thành phố Hồ Chí Minh	2026-05-21 08:12:55.942+00	0x5350a5f41d21adb686ee2300953fad7e812360bfd18635f6afa25fb46a1bd49c	0x17f5d0928b132f06f9f2bfe7f5e81dd5024336075806a3f649051d7fac3d8790	t	0x966d5c5d952378bfba2c88c234e9d5921a5e508b250c4f779ac4cd7640bc701f	0xD1fB76Ec07CA7de60BFC5554D410A433733e10D3	0x44e2bA1AdB3B7805a4499c6795b0E2B6F9184F49	11155111	10890750	2026-05-21 08:35:37.935299+00	t	7	0x57f8d8988b0a627f57203ba795d2425ea4b7dfab7c3cf5e9ee98ad0efc491ba7	0x87e5a0d27dF70FF87221744236B2A9dc333d66B7	11155111	10890751	2026-05-21 08:35:49.841706+00
10	5	https://res.cloudinary.com/dv0nscnyd/image/upload/v1779352693/locket/posts/dfuovg1wugqaslz4byib.jpg	logo mới	2026-05-21 08:38:24.556+00	0xc002865e2453425cb8a55785241cddde4fcd017db1095d70836a984697bb3e20	0x672620ce43f58a54e352f8ccdb8272799f1f2fabba3587091ae899cbc98ab3da	f				\N	\N	\N	f	\N			\N	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, username, bio, avatar_url, created_at, role) FROM stdin;
1	admin@locket.local	$2a$10$JISWmIXlyw83hd9PKmAIMuUc07rLWInFauwb003OACfJT4.5qiYXu	admin	Quan tri vien nen tang Locket DApp.		2026-05-17 08:11:01.679065+00	admin
2	user1@locket.local	$2a$10$JISWmIXlyw83hd9PKmAIMuUc07rLWInFauwb003OACfJT4.5qiYXu	anh_khoa	Chia se khoanh khac moi ngay.		2026-05-17 08:11:01.679065+00	user
3	user2@locket.local	$2a$10$JISWmIXlyw83hd9PKmAIMuUc07rLWInFauwb003OACfJT4.5qiYXu	minh_anh	Thich anh doi thuong va ban be.		2026-05-17 08:11:01.679065+00	user
4	user3@locket.local	$2a$10$JISWmIXlyw83hd9PKmAIMuUc07rLWInFauwb003OACfJT4.5qiYXu	quang_huy	Luu lai nhung ngay dang nho.		2026-05-17 08:11:01.679065+00	user
5	user4@locket.local	$2a$10$JISWmIXlyw83hd9PKmAIMuUc07rLWInFauwb003OACfJT4.5qiYXu	linh_chi	Feed nho cho nhung nguoi than.		2026-05-17 08:11:01.679065+00	user
6	user5@locket.local	$2a$10$JISWmIXlyw83hd9PKmAIMuUc07rLWInFauwb003OACfJT4.5qiYXu	bao_ngoc	Khoanh khac dac biet moi ngay.		2026-05-17 08:11:01.679065+00	user
7	messagetest@example.com	$2a$10$zIRrpzAiUdbCMcKASkN6Le7qjJQ9MsYuUwx/vhdnYgU62pkBnTRoq	\N			2026-05-21 07:54:17.923727+00	user
\.


--
-- Name: friend_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.friend_requests_id_seq', 1, false);


--
-- Name: friendship_milestones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.friendship_milestones_id_seq', 1, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 6, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.posts_id_seq', 10, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 7, true);


--
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (follower_id, following_id);


--
-- Name: friend_requests friend_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_pkey PRIMARY KEY (id);


--
-- Name: friend_requests friend_requests_requester_id_recipient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_requester_id_recipient_id_key UNIQUE (requester_id, recipient_id);


--
-- Name: friendship_milestones friendship_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendship_milestones
    ADD CONSTRAINT friendship_milestones_pkey PRIMARY KEY (id);


--
-- Name: friendship_milestones friendship_milestones_user_id_a_user_id_b_milestone_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendship_milestones
    ADD CONSTRAINT friendship_milestones_user_id_a_user_id_b_milestone_type_key UNIQUE (user_id_a, user_id_b, milestone_type);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: post_reactions post_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_pkey PRIMARY KEY (post_id, user_id, reaction_type);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_follows_follower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follows_follower ON public.follows USING btree (follower_id);


--
-- Name: idx_friend_requests_recipient_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friend_requests_recipient_status ON public.friend_requests USING btree (recipient_id, status, created_at DESC);


--
-- Name: idx_friendship_milestones_pair; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friendship_milestones_pair ON public.friendship_milestones USING btree (user_id_a, user_id_b);


--
-- Name: idx_messages_participants_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_participants_created_at ON public.messages USING btree (sender_id, recipient_id, created_at DESC);


--
-- Name: idx_messages_recipient_read_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_recipient_read_at ON public.messages USING btree (recipient_id, read_at, created_at DESC);


--
-- Name: idx_post_reactions_post_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_reactions_post_created_at ON public.post_reactions USING btree (post_id, created_at DESC);


--
-- Name: idx_posts_minted_nft; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_minted_nft ON public.posts USING btree (is_minted_nft, created_at DESC);


--
-- Name: idx_posts_user_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_user_created_at ON public.posts USING btree (user_id, created_at DESC);


--
-- Name: idx_posts_verified_onchain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_verified_onchain ON public.posts USING btree (is_verified_onchain, created_at DESC);


--
-- Name: follows follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: follows follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friend_requests friend_requests_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friend_requests friend_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friendship_milestones friendship_milestones_user_id_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendship_milestones
    ADD CONSTRAINT friendship_milestones_user_id_a_fkey FOREIGN KEY (user_id_a) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friendship_milestones friendship_milestones_user_id_b_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendship_milestones
    ADD CONSTRAINT friendship_milestones_user_id_b_fkey FOREIGN KEY (user_id_b) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


--
-- Name: messages messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: post_reactions post_reactions_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_reactions post_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 7Z0MTq6GMMFb2jKYJulTrH3ebwGISlqFSQIgoHR8WBSbhfHzGgIREcGuw8mxvJj
