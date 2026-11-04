from app.api.endpoints.workspaces import PUBLIC_REPO_URL


def test_public_repo_url_validation():
    ok = PUBLIC_REPO_URL.match("https://github.com/pallets/flask")
    assert ok and ok.group("owner") == "pallets" and ok.group("repo") == "flask"
    assert PUBLIC_REPO_URL.match("https://gitlab.com/group/project.git").group("repo") == "project"
    for bad in [
        "http://github.com/a/b",
        "file:///etc/passwd",
        "https://github.com/a/b/c",
        "https://evil.com/a/b",
        "https://github.com/-u/b",
        "git@github.com:a/b.git",
        "https://github.com/a/b?x=1",
    ]:
        assert not PUBLIC_REPO_URL.match(bad), bad
