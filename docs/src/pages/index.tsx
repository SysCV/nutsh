import React from "react";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import Layout from "@theme/Layout";
import CodeBlock from "@theme/CodeBlock";

const features = [
  {
    title: "Intuitive",
    content: "Install in one line, launch with zero setup, and use with infinite ease.",
  },
  {
    title: "Versatile",
    content:
      "Easily adapt to your own situation with a design inspired by real-world use cases from both academia and industry.",
  },
  {
    title: "Powered by AI",
    content: "Achieve more with another intelligence.",
  },
];

const headerButtonClass = "button button--outline button--primary button--lg";

function Home() {
  const {
    siteConfig: { customFields },
  } = useDocusaurusContext();

  return (
    <Layout>
      <div style={{ textAlign: "center", padding: "4em", background: "#141414" }}>
        <img style={{ height: 64 }} src={useBaseUrl("img/banner.svg")} />
        <p style={{ fontSize: "1.5em" }}>A platform for visual learning from human feedback</p>
        <div>
          <Link to={useBaseUrl("Quick%20Start")} className={headerButtonClass} style={{ width: 180 }}>
            Quick Start
          </Link>
          <Link to="pathname://../app" className={headerButtonClass} style={{ marginLeft: 16, width: 180 }}>
            {(customFields["startTitle"] ?? "Enter Platform") as string}
          </Link>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "4rem", width: "100%" }}>
        <div className="row">
          {features.map(({ title, content }, idx) => (
            <div key={idx} className="col col--4">
              <h2>{title}</h2>
              <p>{content}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: "#33363b" }}>
        <div className="container padding-vert--xl text--left">
          <div className="row">
            <div className="col col--4 col--offset-1">
              <h2>Start Immediately</h2>
              <p>No dependencies nor setups. Simply install by:</p>
              <CodeBlock className="language-sh">eval "$(curl -sSL nutsh.ai/install)"</CodeBlock>
              <p>and start:</p>
              <CodeBlock className="language-sh">nutsh</CodeBlock>
              <br />
            </div>
            <div className="col col--5 col--offset-1">
              {/* GIF is generated using https://github.com/faressoft/terminalizer */}
              <img src={useBaseUrl("gif/start.gif")} />
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="container padding-vert--xl text--left">
          <div className="row">
            <div className="col col--5 col--offset-1">
              <img src={useBaseUrl("gif/track.gif")} />
            </div>
            <div className="col col--4 col--offset-1">
              <h2>One Tool, Multiple Scenarios</h2>
              <p>
                From various annotation types such as polygons and masks, to diverse scenarios like obstruction or
                tracking, nutsh is always up to the task.
              </p>
              <br />
            </div>
          </div>
        </div>
      </div>
      <div style={{ background: "#33363b" }}>
        <div className="container padding-vert--xl text--left">
          <div className="row">
            <div className="col col--5 col--offset-1">
              <h2>Cooperate with AI</h2>
              <p>
                Collaborate seamlessly with any cutting-edge AI model, like{" "}
                <a href="https://segment-anything.com" target="_blank">
                  SAM
                </a>
                . Through prediction, correction, and fine-tuning, you'll have a smart assistant tailored to your needs
                right at your fingertips!
              </p>
            </div>
            <div className="col col--4 col--offset-1">
              {/* Demo images are downloaded from https://unsplash.com */}
              <img src={useBaseUrl("gif/sam.gif")} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Home;
