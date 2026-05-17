--
-- PostgreSQL database dump
--

\restrict 7dBPagYqQdoompJQ1mRx58UVxfba93AjiF00QWWudWefdCe2rVx75gLTwgE0N2n

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: follows; Type: TABLE; Schema: public; Owner: locket
--

CREATE TABLE public.follows (
    follower_id bigint NOT NULL,
    following_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT follows_check CHECK ((follower_id <> following_id))
);


ALTER TABLE public.follows OWNER TO locket;

--
-- Name: friend_requests; Type: TABLE; Schema: public; Owner: locket
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


ALTER TABLE public.friend_requests OWNER TO locket;

--
-- Name: friend_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: locket
--

CREATE SEQUENCE public.friend_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.friend_requests_id_seq OWNER TO locket;

--
-- Name: friend_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: locket
--

ALTER SEQUENCE public.friend_requests_id_seq OWNED BY public.friend_requests.id;


--
-- Name: friendship_milestones; Type: TABLE; Schema: public; Owner: locket
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


ALTER TABLE public.friendship_milestones OWNER TO locket;

--
-- Name: friendship_milestones_id_seq; Type: SEQUENCE; Schema: public; Owner: locket
--

CREATE SEQUENCE public.friendship_milestones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.friendship_milestones_id_seq OWNER TO locket;

--
-- Name: friendship_milestones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: locket
--

ALTER SEQUENCE public.friendship_milestones_id_seq OWNED BY public.friendship_milestones.id;


--
-- Name: post_reactions; Type: TABLE; Schema: public; Owner: locket
--

CREATE TABLE public.post_reactions (
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    reaction_type character varying(32) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.post_reactions OWNER TO locket;

--
-- Name: posts; Type: TABLE; Schema: public; Owner: locket
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


ALTER TABLE public.posts OWNER TO locket;

--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: locket
--

CREATE SEQUENCE public.posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_id_seq OWNER TO locket;

--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: locket
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: locket
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


ALTER TABLE public.users OWNER TO locket;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: locket
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO locket;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: locket
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: friend_requests id; Type: DEFAULT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.friend_requests ALTER COLUMN id SET DEFAULT nextval('public.friend_requests_id_seq'::regclass);


--
-- Name: friendship_milestones id; Type: DEFAULT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.friendship_milestones ALTER COLUMN id SET DEFAULT nextval('public.friendship_milestones_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: follows; Type: TABLE DATA; Schema: public; Owner: locket
--

COPY public.follows (follower_id, following_id, created_at) FROM stdin;
2	1	2026-05-17 09:26:09.240081+00
1	2	2026-05-17 09:26:09.240081+00
\.


--
-- Data for Name: friend_requests; Type: TABLE DATA; Schema: public; Owner: locket
--

COPY public.friend_requests (id, requester_id, recipient_id, status, created_at, responded_at) FROM stdin;
\.


--
-- Data for Name: friendship_milestones; Type: TABLE DATA; Schema: public; Owner: locket
--

COPY public.friendship_milestones (id, user_id_a, user_id_b, milestone_type, token_id, tx_hash, contract_address, chain_id, block_number, minted_at) FROM stdin;
\.


--
-- Data for Name: post_reactions; Type: TABLE DATA; Schema: public; Owner: locket
--

COPY public.post_reactions (post_id, user_id, reaction_type, created_at) FROM stdin;
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: locket
--

COPY public.posts (id, user_id, image_url, caption, created_at, image_hash, content_hash, is_verified_onchain, proof_tx_hash, proof_contract_address, proof_attested_by, proof_chain_id, proof_block_number, proof_recorded_at, is_minted_nft, nft_token_id, nft_tx_hash, nft_contract_address, nft_chain_id, nft_block_number, nft_minted_at) FROM stdin;
1	2	https://res.cloudinary.com/dv0nscnyd/image/upload/v1779005720/locket/posts/xqn8gaqmrnvjvnuotnvy.jpg	Joke of the đay	2026-05-17 08:15:34.58+00	0x5163d02a6c6c9e15f209fdc5bc21928b5394b41b5780806dcd6f5bd1539583d4	0x06c72d59e95d1fe672234b21c3bac9ded8cd9726884d562f47543ce477ffd180	t	0x49977675fb976bd5ecabaef19a260e862ed978408944659cc5d726dcc041eb3c	0xD1fB76Ec07CA7de60BFC5554D410A433733e10D3	0x44e2bA1AdB3B7805a4499c6795b0E2B6F9184F49	11155111	10867360	2026-05-17 08:15:54.47169+00	t	4	0x87894253f6f06815d23f297c55a1c943fd4a35628d2f503319c6f6c218c9c180	0x87e5a0d27dF70FF87221744236B2A9dc333d66B7	11155111	10867389	2026-05-17 08:23:28.052642+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: locket
--

COPY public.users (id, email, password_hash, username, bio, avatar_url, created_at, role) FROM stdin;
1	admin@locket.local	$2a$10$JISWmIXlyw83hd9PKmAIMuUc07rLWInFauwb003OACfJT4.5qiYXu	admin	Quan tri vien nen tang Locket DApp.		2026-05-17 08:11:01.679065+00	admin
2	user1@locket.local	$2a$10$JISWmIXlyw83hd9PKmAIMuUc07rLWInFauwb003OACfJT4.5qiYXu	anh_khoa	Chia se khoanh khac moi ngay.		2026-05-17 08:11:01.679065+00	user
3	user2@locket.local	$2a$10$JISWmIXlyw83hd9PKmAIMuUc07rLWInFauwb003OACfJT4.5qiYXu	minh_anh	Thich anh doi thuong va ban be.		2026-05-17 08:11:01.679065+00	user
4	user3@locket.local	$2a$10$JISWmIXlyw83hd9PKmAIMuUc07rLWInFauwb003OACfJT4.5qiYXu	quang_huy	Luu lai nhung ngay dang nho.		2026-05-17 08:11:01.679065+00	user
5	user4@locket.local	$2a$10$JISWmIXlyw83hd9PKmAIMuUc07rLWInFauwb003OACfJT4.5qiYXu	linh_chi	Feed nho cho nhung nguoi than.		2026-05-17 08:11:01.679065+00	user
6	user5@locket.local	$2a$10$JISWmIXlyw83hd9PKmAIMuUc07rLWInFauwb003OACfJT4.5qiYXu	bao_ngoc	Khoanh khac dac biet moi ngay.		2026-05-17 08:11:01.679065+00	user
\.


--
-- Name: friend_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: locket
--

SELECT pg_catalog.setval('public.friend_requests_id_seq', 1, false);


--
-- Name: friendship_milestones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: locket
--

SELECT pg_catalog.setval('public.friendship_milestones_id_seq', 1, false);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: locket
--

SELECT pg_catalog.setval('public.posts_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: locket
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (follower_id, following_id);


--
-- Name: friend_requests friend_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_pkey PRIMARY KEY (id);


--
-- Name: friend_requests friend_requests_requester_id_recipient_id_key; Type: CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_requester_id_recipient_id_key UNIQUE (requester_id, recipient_id);


--
-- Name: friendship_milestones friendship_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.friendship_milestones
    ADD CONSTRAINT friendship_milestones_pkey PRIMARY KEY (id);


--
-- Name: friendship_milestones friendship_milestones_user_id_a_user_id_b_milestone_type_key; Type: CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.friendship_milestones
    ADD CONSTRAINT friendship_milestones_user_id_a_user_id_b_milestone_type_key UNIQUE (user_id_a, user_id_b, milestone_type);


--
-- Name: post_reactions post_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_pkey PRIMARY KEY (post_id, user_id, reaction_type);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_follows_follower; Type: INDEX; Schema: public; Owner: locket
--

CREATE INDEX idx_follows_follower ON public.follows USING btree (follower_id);


--
-- Name: idx_friend_requests_recipient_status; Type: INDEX; Schema: public; Owner: locket
--

CREATE INDEX idx_friend_requests_recipient_status ON public.friend_requests USING btree (recipient_id, status, created_at DESC);


--
-- Name: idx_friendship_milestones_pair; Type: INDEX; Schema: public; Owner: locket
--

CREATE INDEX idx_friendship_milestones_pair ON public.friendship_milestones USING btree (user_id_a, user_id_b);


--
-- Name: idx_post_reactions_post_created_at; Type: INDEX; Schema: public; Owner: locket
--

CREATE INDEX idx_post_reactions_post_created_at ON public.post_reactions USING btree (post_id, created_at DESC);


--
-- Name: idx_posts_minted_nft; Type: INDEX; Schema: public; Owner: locket
--

CREATE INDEX idx_posts_minted_nft ON public.posts USING btree (is_minted_nft, created_at DESC);


--
-- Name: idx_posts_user_created_at; Type: INDEX; Schema: public; Owner: locket
--

CREATE INDEX idx_posts_user_created_at ON public.posts USING btree (user_id, created_at DESC);


--
-- Name: idx_posts_verified_onchain; Type: INDEX; Schema: public; Owner: locket
--

CREATE INDEX idx_posts_verified_onchain ON public.posts USING btree (is_verified_onchain, created_at DESC);


--
-- Name: follows follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: follows follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friend_requests friend_requests_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friend_requests friend_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friendship_milestones friendship_milestones_user_id_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.friendship_milestones
    ADD CONSTRAINT friendship_milestones_user_id_a_fkey FOREIGN KEY (user_id_a) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friendship_milestones friendship_milestones_user_id_b_fkey; Type: FK CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.friendship_milestones
    ADD CONSTRAINT friendship_milestones_user_id_b_fkey FOREIGN KEY (user_id_b) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: post_reactions post_reactions_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_reactions post_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: locket
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 7dBPagYqQdoompJQ1mRx58UVxfba93AjiF00QWWudWefdCe2rVx75gLTwgE0N2n

