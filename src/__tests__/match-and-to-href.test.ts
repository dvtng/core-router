import { Rule } from "../types";
import { match } from "../match";
import { toHref } from "../to-href";
import { setLocation } from "./set-location";

setLocation("http://localhost/");

const expectMatch = <T>(
  rule: Rule<T>,
  href: string | URL,
  params: T | null
): void => {
  expect(match(rule, href)).toEqual(
    params === null
      ? null
      : {
          params,
          url: expect.any(URL)
        }
  );
};

const expectToHref = <T>(
  rule: Rule<T>,
  params: T,
  href: string | Error
): void => {
  if (href instanceof Error) {
    expect(() => toHref(rule, params)).toThrowError();
  } else {
    expect(toHref(rule, params)).toEqual(href);
  }
};

it("empty", () => {
  const rule = {};

  expectMatch(rule, "", {});
  expectMatch(rule, "/", {});
  expectMatch(rule, "/a/b/c?d=e#hash", {});
  expectMatch(rule, "http://localhost", {});
  expectMatch(rule, "http://localhost/", {});
  expectMatch(rule, "//localhost/", {});
  expectMatch(rule, "http://localhost/a/b/c", {});
  expectMatch(rule, "https://localhost/", null);
  expectMatch(rule, "http://localhost:3000/", null);
  expectMatch(rule, "http://another/", null);
  expectMatch(rule, "javascript:alert(1)", null);

  expectToHref(rule, {}, "");
  expectToHref(rule, { extraParam: "ignored" }, "");
});

it("root path", () => {
  const rule = { path: "/" };

  expectMatch(rule, "", {});
  expectMatch(rule, "/", {});
  expectMatch(rule, "?", {});
  expectMatch(rule, "/?", {});
  expectMatch(rule, "#hash", {});
  expectMatch(rule, "/#hash", {});
  expectMatch(rule, "/a/b/c?d=e", null);
  expectMatch(rule, "/index.html", null);

  expectToHref(rule, {}, "/");
  expectToHref(rule, { extraParam: "ignored" }, "/");
});

it("simple path", () => {
  const rule = { path: "/a/b/c" };

  expectMatch(rule, "", null);
  expectMatch(rule, "/", null);
  expectMatch(rule, "/a/b/c", {});
  expectMatch(rule, "/a/b/c/", {});
  expectMatch(rule, "/a/b/c/#hash", {});
  expectMatch(rule, "/A/B/C/", {});
  expectMatch(rule, "/a%2Fb/c", null);
  expectMatch(rule, "/a/b/c/?d=e", {});
  expectMatch(rule, "./a/b/c", {});
  expectMatch(rule, "/a/b/c/d", null);
  expectMatch(rule, "/d/a/b/c", null);

  expectToHref(rule, {}, "/a/b/c");
  expectToHref(rule, { extraParam: "ignored" }, "/a/b/c");
});

it("simple path with trailing slash", () => {
  const rule = { path: "/a/b/c/" };

  expectMatch(rule, "", null);
  expectMatch(rule, "/", null);
  expectMatch(rule, "/a/b/c", {});
  expectMatch(rule, "/a/b/c/", {});
  expectMatch(rule, new URL("http://localhost/a/b/c"), {});
  expectMatch(rule, "/A/B/C/", {});
  expectMatch(rule, "/a%2Fb/c/", null);
  expectMatch(rule, "/a/b/c/?d=e", {});
  expectMatch(rule, "./a/b/c", {});
  expectMatch(rule, "/a/b/c/d", null);

  expectToHref(rule, {}, "/a/b/c");
});

it("path with encoding", () => {
  const rule = { path: "/a%2Fb/c" };

  expectMatch(rule, "/a/b/c", null);
  expectMatch(rule, "/a%2Fb/c", {});
  expectMatch(rule, "/A%2FB/C", {});

  expectToHref(rule, {}, "/a%2Fb/c");
});

it("/index.html", () => {
  const rule = { path: "/index.html" };

  expectMatch(rule, "", null);
  expectMatch(rule, "/", null);
  expectMatch(rule, "/index:html", null);
  expectMatch(rule, "/index.htmls", null);
  expectMatch(rule, "/index.html", {});
  expectMatch(rule, "/index.HTML", {});
  expectMatch(rule, "/index.html?a=b", {});

  expectToHref(rule, {}, "/index.html");
});

it("path with single param", () => {
  const rule = { path: "/:accId" };

  expectMatch(rule, "/abcdef", { accId: "abcdef" });
  expectMatch(rule, "/abcdef/", { accId: "abcdef" });
  expectMatch(rule, "/abcdef/ghi", null);
  expectMatch(rule, "/ghi/abcdef", null);
  expectMatch(rule, "/caf%C3%A9", { accId: "café" });

  expectToHref(rule, { accId: "abcdef" }, "/abcdef");
  expectToHref(rule, { accId: "café" }, "/caf%C3%A9");
});

it("path with multiple params", () => {
  const rule = {
    path: "/:accType(checking|saving|credit)/:accId/:accName([^$]+)?"
  };

  expectMatch(rule, "/saving/123", {
    accType: "saving",
    accId: "123"
  });
  expectMatch(rule, "/saving/123/", {
    accType: "saving",
    accId: "123"
  });
  expectMatch(rule, "/SAVING/123", {
    accType: "SAVING",
    accId: "123"
  });
  expectMatch(rule, "/saving/123/My%20Savings", {
    accType: "saving",
    accId: "123",
    accName: "My Savings"
  });
  expectMatch(rule, "/saving/123/banned-char-$", null);
  expectMatch(rule, "/sav/123", null);
  expectMatch(rule, "/savings/123", null);
  expectMatch(rule, "/saving", null);

  expectToHref(rule, { accType: "saving", accId: "abcdef" }, "/saving/abcdef");
  expectToHref(
    rule,
    {
      accType: "saving",
      accId: "abcdef",
      accName: "🏖️ Savings"
    },
    "/saving/abcdef/%F0%9F%8F%96%EF%B8%8F%20Savings"
  );
  expectToHref(
    rule,
    { accType: "sav", accId: "abcdef", accName: "My Savings" },
    new Error()
  );
});

it("single search param", () => {
  const rule = { search: { src: ":src?" } };

  expectMatch(rule, "?src=email", { src: "email" });
  expectMatch(rule, "/a/b/c?src=email#hash", { src: "email" });
  expectMatch(rule, "?before&src=email&after", { src: "email" });
  expectMatch(rule, "?src", {});
  expectMatch(rule, "?", {});
  expectMatch(rule, "", {});
  expectMatch(rule, "?src=e/m/a/i/l", { src: "e/m/a/i/l" });
  expectMatch(rule, "?src=e%2Fm%2Fa%2Fi%2Fl", { src: "e/m/a/i/l" });
  expectMatch(rule, "?src=a%26b?", { src: "a&b?" });

  expectToHref(rule, {}, "");
  expectToHref(rule, { src: "e/m/a/i/l" }, "?src=e%2Fm%2Fa%2Fi%2Fl");
  expectToHref(rule, { src: "a&b?" }, "?src=a%26b%3F");
});

it("multiple search params", () => {
  const rule = {
    search: {
      from: ":fromDate([0-9-]+)",
      to: ":toDate([0-9-]+)?",
      page: ":pageNumber([0-9]+)?"
    }
  };

  expectMatch(rule, "?from=2020-01-01", { fromDate: "2020-01-01" });
  expectMatch(rule, "?from=2020-01-01&to=2020-02-01", {
    fromDate: "2020-01-01",
    toDate: "2020-02-01"
  });
  expectMatch(rule, "?from=2020-01-01&to=2020-02-01&page=1", {
    fromDate: "2020-01-01",
    toDate: "2020-02-01",
    pageNumber: "1"
  });
  expectMatch(
    rule,
    "/a/b/c?otherParam=ignored&from=2020-01-01&to=2020-02-01&page=1#hash",
    {
      fromDate: "2020-01-01",
      toDate: "2020-02-01",
      pageNumber: "1"
    }
  );
  expectMatch(rule, "?to=2020-02-01&page=1", null);
  expectMatch(rule, "?from=2020-01-01&to=INVALID", null);

  expectToHref(rule, { fromDate: "2020-01-01" }, "?from=2020-01-01");
  expectToHref(
    rule,
    {
      fromDate: "2020-01-01",
      toDate: "2020-02-01",
      pageNumber: "1",
      extraParam: "ignored"
    },
    "?from=2020-01-01&page=1&to=2020-02-01"
  );
  expectToHref(
    rule,
    {
      fromDate: "2020-01-01",
      toDate: "INVALID",
      pageNumber: "1"
    },
    new Error()
  );
});

it("everything", () => {
  const rule: Rule<{
    accType: "checking" | "saving" | "credit";
    accId: string;
    accName?: string;
    fromDate?: string;
    src?: "email" | "other";
  }> = {
    path: "/:accType(checking|saving|credit)/:accId([0-9]+)/:accName([^$]+)?",
    search: {
      from: ":fromDate?",
      src: ":src(email|other)?"
    },
    condition: match => {
      if (
        match.params.fromDate &&
        isNaN(new Date(match.params.fromDate).getDate())
      ) {
        return false;
      }
      return true;
    }
  };

  expectMatch(rule, "/checking/123/My%20Checking", {
    accType: "checking",
    accId: "123",
    accName: "My Checking"
  });
  expectMatch(rule, "/checking/123/My%20Checking?from=2020-01-01&src=email", {
    accType: "checking",
    accId: "123",
    accName: "My Checking",
    fromDate: "2020-01-01",
    src: "email"
  });
  expectMatch(
    rule,
    "http://localhost/checking/123/My%20Checking?from=2020-01-01&src=email",
    {
      accType: "checking",
      accId: "123",
      accName: "My Checking",
      fromDate: "2020-01-01",
      src: "email"
    }
  );
  expectMatch(rule, "/check/123/Checking?from=2020-01-01&src=email", null);
  expectMatch(rule, "/checking/Checking?from=2020-01-01&src=email", null);
  expectMatch(rule, "/checking/123/Checking?from=2020-20-20&src=email", null);
  expectMatch(rule, "/checking/123/Checking?from=2020-01-01&src=unknown", null);

  expectToHref(rule, { accType: "checking", accId: "123" }, "/checking/123");
  expectToHref(
    rule,
    {
      accType: "checking",
      accId: "123",
      accName: "My Checking",
      fromDate: "2020-01-01",
      src: "email"
    },
    "/checking/123/My%20Checking?from=2020-01-01&src=email"
  );
  expectToHref(
    rule,
    {
      accType: "checking",
      accId: "123a",
      accName: "My Checking",
      fromDate: "2020-01-01",
      src: "email"
    },
    new Error()
  );
  expectToHref(
    rule,
    {
      accType: "checking",
      accId: "123",
      accName: "My Checking",
      fromDate: "2020-20-20",
      src: "email"
    },
    new Error()
  );
});
