;; CraftNest Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101)) 
(define-constant err-unauthorized (err u102))
(define-constant err-session-full (err u103))
(define-constant err-session-inactive (err u104))

;; Define fungible token for reputation
(define-fungible-token craft-reputation)

;; Data structures
(define-map tutorials
    { tutorial-id: uint }
    {
        creator: principal,
        title: (string-ascii 100),
        votes: uint,
        reward-claimed: bool
    }
)

(define-map collaborative-sessions
    { session-id: uint }
    {
        host: principal,
        tutorial-id: uint,
        max-participants: uint,
        registered-count: uint,
        active: bool,
        end-block-height: uint
    }
)

;; Data vars
(define-data-var tutorial-count uint u0)
(define-data-var session-count uint u0)

;; Tutorial functions
(define-public (create-tutorial (title (string-ascii 100)))
    (let
        ((new-id (+ (var-get tutorial-count) u1)))
        (try! (map-insert tutorials
            { tutorial-id: new-id }
            {
                creator: tx-sender,
                title: title,
                votes: u0,
                reward-claimed: false
            }
        ))
        (var-set tutorial-count new-id)
        (ok new-id)
    )
)

(define-public (vote-tutorial (tutorial-id uint))
    (match (map-get? tutorials { tutorial-id: tutorial-id })
        tutorial (begin
            (try! (map-set tutorials
                { tutorial-id: tutorial-id }
                (merge tutorial { votes: (+ (get votes tutorial) u1) })
            ))
            (ft-mint? craft-reputation u1 tx-sender)
        )
        (err err-not-found)
    )
)

;; Collaborative session functions
(define-public (create-session (tutorial-id uint) (max-participants uint) (duration uint))
    (let
        ((new-id (+ (var-get session-count) u1))
         (end-height (+ block-height duration)))
        (try! (map-insert collaborative-sessions
            { session-id: new-id }
            {
                host: tx-sender,
                tutorial-id: tutorial-id,
                max-participants: max-participants,
                registered-count: u0,
                active: true,
                end-block-height: end-height
            }
        ))
        (var-set session-count new-id)
        (ok new-id)
    )
)

(define-public (join-session (session-id uint))
    (match (map-get? collaborative-sessions { session-id: session-id })
        session (begin
            (asserts! (get active session) (err err-session-inactive))
            (asserts! (<= block-height (get end-block-height session)) (err err-session-inactive))
            (asserts! (< (get registered-count session) (get max-participants session)) (err err-session-full))
            (try! (map-set collaborative-sessions
                { session-id: session-id }
                (merge session { registered-count: (+ (get registered-count session) u1) })
            ))
            (ft-mint? craft-reputation u5 tx-sender)
        )
        (err err-not-found)
    )
)

;; Read only functions
(define-read-only (get-tutorial (tutorial-id uint))
    (map-get? tutorials { tutorial-id: tutorial-id })
)

(define-read-only (get-session (session-id uint))
    (map-get? collaborative-sessions { session-id: session-id })
)
