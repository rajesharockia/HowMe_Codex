import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { requestDigitalPet, requestFutureSimulation } from "./futurePersona";
import {
  Profile,
  ScenarioId,
  scenarioPlans,
  scenarioPrompt,
} from "./scenarioEngine";

type Screen = "welcome" | "onboard" | "explore" | "pet";
type Generation = {
  image?: string;
  state: "idle" | "loading" | "ready" | "error";
  error?: string;
};
const initialProfile: Profile = {
  name: "",
  age: 30,
  movement: "A couple of times a week",
  sleep: "6–7 hours most nights",
  nutrition: "Mostly home-cooked meals",
  goal: "Feel more energetic and consistent",
  details: "",
};

function Brand() {
  return <div className="wordmark"><span className="logo-mark" aria-hidden="true"><b>h</b><b>m</b></span><span className="brand-name"><i>how</i><i>-me</i></span></div>;
}

function PetDock({ image, onOpen }: { image?: string; onOpen: () => void }) {
  if (!image) return null;
  return (
    <button className="howme-pet-dock" onClick={onOpen} aria-label="Open your HowMe digital pet" title="Your HowMe pet">
      <span className="pet-glow" />
      <img src={image} alt="Your HowMe digital pet" />
      <b>howme</b>
    </button>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [referenceImage, setReferenceImage] = useState<string>();
  const [yearsAhead, setYearsAhead] = useState(10);
  const [customAge, setCustomAge] = useState("");
  const [selected, setSelected] = useState<ScenarioId>("active");
  const [results, setResults] = useState<Record<string, Generation>>({});
  const [petSourceImage, setPetSourceImage] = useState<string>();
  const [petResult, setPetResult] = useState<Generation>({ state: "idle" });
  const petRequest = useRef(0);
  const plans = useMemo(() => scenarioPlans(profile), [profile]);
  const selectedPlan = plans.find((plan) => plan.id === selected)!;
  const futureAge = profile.age + yearsAhead;
  const keyFor = (id: ScenarioId) => `${id}:${yearsAhead}`;
  const currentResult = results[keyFor(selected)];
  const selectedImage = currentResult?.image || referenceImage;
  const futureCommentary = `HOWME NOTES — ${selectedPlan.recommendation}\n\nTIPS & TRICKS\n• Start with one repeatable movement moment this week.\n• Make your next meal and bedtime easier before the day gets busy.\n• Choose clothing and routines that make the path feel like you, not a punishment.`;
  const [typedCommentary, setTypedCommentary] = useState("");
  useEffect(() => {
    if (currentResult?.state !== "ready") {
      setTypedCommentary("");
      return;
    }
    setTypedCommentary("");
    let cursor = 0;
    const interval = window.setInterval(() => {
      cursor += 1;
      setTypedCommentary(futureCommentary.slice(0, cursor));
      if (cursor >= futureCommentary.length) window.clearInterval(interval);
    }, 13);
    return () => window.clearInterval(interval);
  }, [currentResult?.state, futureCommentary]);
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((previous) => ({ ...previous, [key]: value }));
  const applyCustomAge = () => {
    if (!customAge.trim()) return;
    const targetAge = Number(customAge);
    if (!Number.isInteger(targetAge) || targetAge <= profile.age) {
      window.alert(`Enter a whole future age greater than ${profile.age}.`);
      return;
    }
    setYearsAhead(targetAge - profile.age);
  };
  const startPet = () => {
    if (!selectedImage) return;
    setPetSourceImage(selectedImage);
    setPetResult({ state: "idle" });
    setScreen("pet");
    void generatePet(selectedImage);
  };
  const generatePet = async (sourceImage = petSourceImage) => {
    if (!sourceImage) return;
    const requestId = ++petRequest.current;
    setPetResult({ state: "loading" });
    try {
      const image = await requestDigitalPet(sourceImage);
      if (requestId === petRequest.current) setPetResult({ state: "ready", image });
    } catch (error) {
      if (requestId === petRequest.current) setPetResult({ state: "error", error: error instanceof Error ? error.message : "Pet creation failed. Please try again." });
    }
  };

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8_000_000) {
      window.alert("Please choose a JPG, PNG, or WebP portrait under 8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(String(reader.result));
      setResults({});
    };
    reader.readAsDataURL(file);
  };
  const generate = async (id: ScenarioId) => {
    if (!referenceImage) {
      setScreen("onboard");
      setStep(0);
      window.alert(
        "Add a clear portrait first so HowMe has an identity reference.",
      );
      return;
    }
    const key = keyFor(id);
    if (results[key]?.state === "loading") return;
    const plan = plans.find((item) => item.id === id)!;
    setSelected(id);
    setResults((previous) => ({ ...previous, [key]: { state: "loading" } }));
    try {
      const image = await requestFutureSimulation({
        originalImage: referenceImage,
        currentAge: profile.age,
        yearsAhead,
        scenario:
          plan.label === "Active lifestyle"
            ? "Active path"
            : plan.label === "Intense training"
              ? "Intense training path"
            : plan.label === "Current habits"
              ? "Your current path"
              : plan.label === "High-risk routine"
                ? "High-risk path"
                : "Less active path",
        lifestyleSummary: scenarioPrompt(plan, profile),
      });
      setResults((previous) => ({
        ...previous,
        [key]: { state: "ready", image },
      }));
    } catch (error) {
      setResults((previous) => ({
        ...previous,
        [key]: {
          state: "error",
          error:
            error instanceof Error
              ? error.message
              : "Generation failed. Please try again.",
        },
      }));
    }
  };

  if (screen === "welcome")
    return (
      <main className="welcome">
        <nav className="topnav">
          <Brand />
          <div className="navlinks">
            <a>Explore</a>
            <a>How it works</a>
            <button onClick={() => setScreen("onboard")}>
              Get started <b>→</b>
            </button>
          </div>
        </nav>
        <section className="welcome-hero">
          <div className="hero-copy">
            <p className="kicker">A FUTURE-SELF SIMULATOR</p>
            <h1>
              <span className="hero-how">how</span><span className="hero-me">-me</span>
              <br />
              <span className="hero-qualifier">shows you</span> <em>how you might look over time.</em>
            </h1>
            <p className="hero-text">
              Explore three possible future versions of you, then choose the
              habits that feel worth practising today.
            </p>
            <ul>
              <li>Illustrative future portraits</li>
              <li>Structured lifestyle scenarios</li>
              <li>A companion that keeps it practical</li>
            </ul>
            <button
              className="gradient-button"
              onClick={() => setScreen("onboard")}
            >
              Start how-me <b>→</b>
            </button>
            <p className="disclaimer">
              Hypothetical visual explorations. Not health or appearance
              predictions.
            </p>
          </div>
          <div className="hero-visual">
            <div className="aurora" />
            <div className="future-stack">
              <div className="future-silhouette now">NOW</div>
              <div className="future-silhouette plusfive">+5</div>
              <div className="future-silhouette plusten">+10</div>
              <div className="future-silhouette plusfifteen">+15</div>
            </div>
            <span className="hero-caption">
              Your next chapter is a practice
            </span>
          </div>
        </section>
        <PetDock image={petResult.image} onOpen={() => setScreen("pet")} />
      </main>
    );
  if (screen === "onboard")
    return (
      <main className="setup">
        <header>
          <button
            className="back"
            onClick={() => (step ? setStep(step - 1) : setScreen("welcome"))}
          >
            ← Back
          </button>
          <Brand />
          <div className="stepper">
            <i className={step >= 0 ? "on" : ""} />
            <i className={step >= 1 ? "on" : ""} />
          </div>
        </header>
        <section className="setup-card">
          <p className="kicker">0{step + 1} / 02</p>
          {step === 0 && (
            <>
              <h2>
                Let’s create your
                <br />
                <em>digital persona.</em>
              </h2>
              <p>
                Use a clear, full-body photo where possible. HowMe keeps it as
                the identity reference for every independent future simulation.
              </p>
              <label
                className={`photo-drop ${referenceImage ? "has-image" : ""}`}
              >
                {referenceImage ? (
                  <img src={referenceImage} alt="Your identity reference" />
                ) : (
                  <>
                    <strong>⌁</strong>
                    <b>Upload your photo</b>
                    <small>JPG, PNG, WebP · max 8 MB</small>
                  </>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={upload}
                />
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <h2>
                A little about
                <br />
                <em>your rhythm.</em>
              </h2>
              <p>
                Choose the details that make the scenarios feel grounded. You
                can edit them later.
              </p>
              <div className="form-grid">
                <label>
                  What should we call you?
                  <input
                    value={profile.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="Your name"
                  />
                </label>
                <label>
                  Your age
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={profile.age}
                    onChange={(event) =>
                      update("age", Number(event.target.value))
                    }
                  />
                </label>
                <label>
                  Movement
                  <select
                    value={profile.movement}
                    onChange={(event) => update("movement", event.target.value)}
                  >
                    <option>Rarely right now</option>
                    <option>A couple of times a week</option>
                    <option>Three or more times a week</option>
                  </select>
                </label>
                <label>
                  Sleep
                  <select
                    value={profile.sleep}
                    onChange={(event) => update("sleep", event.target.value)}
                  >
                    <option>Under 6 hours</option>
                    <option>6–7 hours most nights</option>
                    <option>7–8 hours most nights</option>
                  </select>
                </label>
              </div>
              <label className="wide-field">
                Your lifestyle, interests, work and routine
                <textarea
                  value={profile.details}
                  onChange={(event) => update("details", event.target.value)}
                  placeholder="For example: desk-based work, badminton on weekends, travel, hobbies, stress levels, preferences…"
                />
              </label>
              <label className="wide-field">
                Your current food rhythm
                <input
                  value={profile.nutrition}
                  onChange={(event) => update("nutrition", event.target.value)}
                />
              </label>
              <label className="wide-field">
                A goal that matters to you
                <textarea
                  value={profile.goal}
                  onChange={(event) => update("goal", event.target.value)}
                />
              </label>
              <div className="privacy-note">
                ✦ Your photo is sent only when you ask HowMe to generate a
                scenario. Future images are illustrative, not predictive.
              </div>
            </>
          )}
          <button
            className="gradient-button full"
            onClick={() =>
              step < 1 ? setStep(step + 1) : setScreen("explore")
            }
          >
            {step < 1 ? "Continue" : "Reveal my futures"} <b>→</b>
          </button>
        </section>
        <PetDock image={petResult.image} onOpen={() => setScreen("pet")} />
      </main>
    );
  if (screen === "pet")
    return (
      <main className="pet-studio">
        <header className="product-header">
          <button className="back" onClick={() => setScreen("explore")}>← Back to your future</button>
          <Brand />
          <span className="pet-stage">HOWME PET STUDIO</span>
        </header>
        <section className="pet-card">
          <div className="pet-copy">
            <p className="kicker">YOUR DIGITAL COMPANION</p>
            <h2>Meet your<br /><em>HowMe pet.</em></h2>
            <p>Created from the future image you were just viewing — so this companion always starts with your current on-screen possibility.</p>
            <ul><li>Realistic 3D character</li><li>Friendly and intelligent presence</li><li>Ready for laptop and mobile</li></ul>
            <button className="gradient-button" disabled={petResult.state === "loading"} onClick={() => void generatePet(petSourceImage)}>{petResult.state === "loading" ? "Creating your companion…" : petResult.state === "ready" ? "Regenerate digital pet" : "Create my digital pet"} <b>→</b></button>
            {petResult.state === "error" && <small className="error">{petResult.error}</small>}
          </div>
          <div className="pet-preview">
            {petResult.image ? <img src={petResult.image} alt="Your HowMe digital pet" /> : petSourceImage ? <img className="pet-source" src={petSourceImage} alt="Current future image used as the pet reference" /> : <div className="empty-persona">∞</div>}
            {petResult.state === "loading" && <div className="image-loader"><i />Building your companion…</div>}
            <span>{petResult.image ? "HOWME DIGITAL PET" : "CURRENT IMAGE · PET REFERENCE"}</span>
          </div>
        </section>
        <PetDock image={petResult.image} onOpen={() => setScreen("pet")} />
      </main>
    );
  return (
    <main className="product">
      <header className="product-header">
        <Brand />
        <div className="identity-chip">
          {referenceImage ? <img src={referenceImage} /> : <i />}
          <span>
            <b>{profile.name || "Your persona"}</b>
            <small>Identity reference</small>
          </span>
        </div>
        <button
          className="outline"
          onClick={() => {
            setScreen("onboard");
            setStep(1);
          }}
        >
          Edit profile
        </button>
      </header>
      <section className="explore-head">
        <div>
          <p className="kicker">EXPLORE POSSIBLE FUTURES</p>
          <h2>
            Choose a horizon.
            <br />
            <em>Meet a possibility.</em>
          </h2>
        </div>
        <div className="timeline">
          <span>
            Today <b>{profile.age}</b>
          </span>
          {[5, 10, 15].map((year) => (
            <button
              className={yearsAhead === year ? "active" : ""}
              onClick={() => setYearsAhead(year)}
              key={year}
            >
              +{year} years
              <br />
              <b>{profile.age + year}</b>
            </button>
          ))}
          <label className="custom-age">
            <span>Custom age</span>
            <input
              type="number"
              min={profile.age + 1}
              step="1"
              value={customAge}
              onChange={(event) => setCustomAge(event.target.value)}
              onBlur={applyCustomAge}
              onKeyDown={(event) => event.key === "Enter" && applyCustomAge()}
              placeholder={`${profile.age + 20}`}
              aria-label={`Custom future age, greater than ${profile.age}`}
            />
          </label>
        </div>
      </section>
      <section className="focus-panel">
        <div className="focus-copy">
          <p className="kicker">
            {selectedPlan.label.toUpperCase()} · AGE {futureAge}
          </p>
          <h3>
            {selectedPlan.shortLabel}
            <br />
            <em>at {futureAge}.</em>
          </h3>
          <p>{selectedPlan.assumption}</p>
          <div className="scenario-switcher" role="group" aria-label="Choose a lifestyle scenario">
            {plans.map((plan) => (
              <button key={plan.id} className={selected === plan.id ? "selected" : ""} onClick={() => { setSelected(plan.id); if (!results[keyFor(plan.id)]?.image) void generate(plan.id); }}>
                <i className={plan.color} />{plan.label}
              </button>
            ))}
          </div>
          <button
            className="gradient-button"
            disabled={currentResult?.state === "loading"}
            onClick={() => generate(selected)}
          >
            {currentResult?.state === "loading"
              ? "Creating your simulation…"
              : currentResult?.state === "ready"
                ? "Regenerate this future"
                : "Generate this future"}{" "}
            <b>→</b>
          </button>
          <button
            className="gradient-button pet-button"
            disabled={currentResult?.state !== "ready"}
            onClick={startPet}
          >
            Create your HowMe digital pet <b>→</b>
          </button>
          {currentResult?.state === "error" && (
            <small className="error">{currentResult.error}</small>
          )}
        </div>
        <div className="focus-image">
          {selectedImage ? (
            <img
              src={selectedImage}
              alt={`${selectedPlan.label} hypothetical portrait`}
            />
          ) : (
            <div className="empty-persona">{(profile.name || "M")[0]}</div>
          )}
          {currentResult?.state === "loading" && (
            <div className="image-loader">
              <i />
              Creating from your original photo…
            </div>
          )}
          <span>HYPOTHETICAL · NOT A PREDICTION</span>
        </div>
      </section>
      <section className={`typewriter-card ${currentResult?.state === "ready" ? "is-typing" : ""}`} aria-live="polite">
        {currentResult?.state === "ready" && (
          <>
            <div className="typewriter-heading"><span>✦</span><p className="kicker">A NOTE FROM YOUR FUTURE SELF</p></div>
            <pre>{typedCommentary}<i aria-hidden="true" /></pre>
          </>
        )}
      </section>
      <PetDock image={petResult.image} onOpen={() => setScreen("pet")} />
    </main>
  );
}
